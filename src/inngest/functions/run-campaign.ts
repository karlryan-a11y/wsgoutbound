import { inngest } from "@/lib/inngest/client"
import { supabaseServer } from "@/lib/supabase/server"
import { generateSql, refineSqlWithFeedback } from "@/lib/anthropic/generate-sql"
import { generateMasterCopy, generatePersonalization } from "@/lib/anthropic/generate-copy"
import { runQuery, runSampleWithTotal, stripTrailingLimit } from "@/lib/bigquery/client"
import { enrichBatchWaterfall, getCreditBalance, LeadMagicApiError } from "@/lib/leadmagic/client"
import { pushLeadsToInstantly } from "@/lib/instantly/client"
import type { CampaignBrief, SqlVersion, Lead, LeadPersonalization } from "@/types"
import type { InstantlyLead } from "@/lib/instantly/client"

const ENRICH_BATCH_SIZE = 30 // leads per Inngest step (waterfall = up to 3 calls/lead)
const PERSONALIZE_BATCH_SIZE = 10 // leads per Inngest step (Claude API calls)
const INSTANTLY_PUSH_BATCH_SIZE = 500 // leads per Instantly push (max 1000)

// ── LeadMagic credit guardrails ─────────────────────────────────────────
// Worst case per lead: validate existing (0.25) + find work (1.0) + find
// personal (1.0) ≈ 2.25. Cap a touch above that, with a hard absolute ceiling.
const CREDIT_CAP_PER_LEAD = 2.5
const ABSOLUTE_MAX_CREDITS = 1500

// ── field extraction helpers (shared with leadmagic client) ──────────
function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim()
  return null
}

function splitFirst(name: string | null): string | null {
  if (!name) return null
  const parts = name.split(/\s+/)
  return parts[0] || null
}

function splitLast(name: string | null): string | null {
  if (!name) return null
  const parts = name.split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : null
}

async function updateCampaign(
  campaignId: string,
  updates: Record<string, unknown>
) {
  const db = supabaseServer()
  await db
    .from("campaigns")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
}

// Turn a raw pipeline error into a clear, user-facing reason.
function friendlyPipelineError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const m = msg.toLowerCase()

  // Expired / invalid Google credentials (BigQuery auth)
  if (
    m.includes("invalid_grant") ||
    m.includes("reauth") ||
    m.includes("expired or revoked") ||
    m.includes("could not load the default credentials") ||
    m.includes("google_application_credentials") ||
    m.includes("invalid_rapt") ||
    m.includes("invalid credential") ||
    m.includes("unable to authenticate")
  ) {
    return "Contact search is unavailable — the BigQuery credential has expired and needs to be refreshed (GCP_SERVICE_ACCOUNT_JSON on Vercel)."
  }

  // BigQuery query / access errors
  if (m.includes("bigquery") || m.includes("not found: table") || m.includes("unrecognized name") || m.includes("syntax error")) {
    return `The contact search query failed in BigQuery: ${msg.slice(0, 200)}`
  }

  // Anthropic / model errors
  if (m.includes("anthropic") || m.includes("rate_limit") || m.includes("overloaded")) {
    return `The AI step failed: ${msg.slice(0, 200)}`
  }

  return msg.slice(0, 240) || "The campaign pipeline failed unexpectedly."
}

export const runCampaign = inngest.createFunction(
  {
    id: "run-campaign",
    retries: 2,
    triggers: [{ event: "campaign/submitted" }],
    // Runs once after all retries are exhausted — so a failed SQL/BigQuery/copy
    // step marks the campaign `failed` with a readable reason instead of
    // leaving it frozen at "Building your search query… 0%".
    onFailure: async ({ error, event }) => {
      const original = (event as { data: { event?: { data?: { campaignId?: string } } } })
        .data?.event
      const campaignId = original?.data?.campaignId
      if (!campaignId) return

      const db = supabaseServer()
      const reason = friendlyPipelineError(error)

      try {
        await db.from("debug_log").insert({
          campaign_id: campaignId,
          step: "pipeline_failed",
          prompt: "Pipeline failed after retries",
          response: JSON.stringify({ error: reason }),
          model: "pipeline",
        })
      } catch {
        // best-effort logging
      }

      await db
        .from("campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaignId)
    },
  },
  async ({ event, step }) => {
    const { campaignId } = event.data as { campaignId: string }
    const db = supabaseServer()

    // Fetch campaign
    const { data: campaign } = await step.run("fetch-campaign", async () => {
      const { data } = await db
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single()
      return { data }
    })

    if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

    const brief = campaign.brief as CampaignBrief
    let sqlVersions: SqlVersion[] = campaign.sql_versions ?? []

    // =========================================================================
    // PHASE 1: SQL Generation + Review Loop
    // =========================================================================
    let sqlApproved = false

    while (!sqlApproved) {
      // Generate SQL
      const sqlResult = await step.run("generate-sql", async () => {
        return await generateSql(brief, sqlVersions)
      })

      // Run query to get a scrollable sample + the TRUE total matching count
      const queryResult = await step.run("run-bq-sample", async () => {
        return await runSampleWithTotal(sqlResult.sql, 200)
      })

      // Run excluded sample query (best-effort)
      const excludedResult = await step.run("run-bq-excluded-sample", async () => {
        if (!sqlResult.excluded_sql) return { rows: [], totalRows: 0 }
        try {
          return await runQuery(sqlResult.excluded_sql, { limit: 10 })
        } catch {
          return { rows: [], totalRows: 0 }
        }
      })

      // Save SQL version
      const newVersion: SqlVersion = {
        sql: sqlResult.sql,
        reasoning: sqlResult.reasoning,
        row_count: queryResult.total,
        sample: queryResult.rows,
        excluded_sample: excludedResult.rows,
        excluded_count: excludedResult.totalRows,
        criteria: sqlResult.criteria,
        ts: new Date().toISOString(),
      }
      sqlVersions = [...sqlVersions, newVersion]

      await step.run("save-sql-version", async () => {
        await updateCampaign(campaignId, {
          status: "awaiting_sql_review",
          sql_versions: sqlVersions,
          candidate_count: queryResult.total,
        })
      })

      // Wait for human review
      const review = await step.waitForEvent("wait-sql-review", {
        event: "campaign/sql-reviewed",
        match: "data.campaignId",
        timeout: "7d",
      })

      if (!review) {
        await updateCampaign(campaignId, { status: "cancelled" })
        return { status: "cancelled", reason: "SQL review timed out" }
      }

      if (review.data.action === "approve") {
        sqlApproved = true
      } else {
        const refined = await step.run("refine-sql", async () => {
          return await refineSqlWithFeedback(
            brief,
            sqlVersions,
            review.data.feedback as string
          )
        })

        const refinedQueryResult = await step.run("run-refined-bq", async () => {
          return await runSampleWithTotal(refined.sql, 200)
        })

        const refinedExcluded = await step.run("run-refined-excluded", async () => {
          if (!refined.excluded_sql) return { rows: [], totalRows: 0 }
          try {
            return await runQuery(refined.excluded_sql, { limit: 10 })
          } catch {
            return { rows: [], totalRows: 0 }
          }
        })

        const refinedVersion: SqlVersion = {
          sql: refined.sql,
          reasoning: refined.reasoning,
          feedback: review.data.feedback as string,
          row_count: refinedQueryResult.total,
          sample: refinedQueryResult.rows,
          excluded_sample: refinedExcluded.rows,
          excluded_count: refinedExcluded.totalRows,
          criteria: refined.criteria,
          ts: new Date().toISOString(),
        }
        sqlVersions = [...sqlVersions, refinedVersion]
      }
    }

    // =========================================================================
    // PHASE 2: Volume Selection
    // =========================================================================
    await step.run("set-awaiting-volume", async () => {
      await updateCampaign(campaignId, { status: "awaiting_volume" })
    })

    const volumeEvent = await step.waitForEvent("wait-volume", {
      event: "campaign/volume-set",
      match: "data.campaignId",
      timeout: "7d",
    })

    if (!volumeEvent) {
      await updateCampaign(campaignId, { status: "cancelled" })
      return { status: "cancelled", reason: "Volume selection timed out" }
    }

    const enrichCount = volumeEvent.data.enrichCount as number

    // Run full query and store leads (strip any generator LIMIT so the
    // user's chosen enrich volume is what actually controls row count)
    const approvedSql = stripTrailingLimit(sqlVersions[sqlVersions.length - 1].sql)
    const fullResults = await step.run("run-full-query", async () => {
      return await runQuery(approvedSql, { limit: enrichCount })
    })

    await step.run("store-leads", async () => {
      // Delete any old leads from previous runs
      await db.from("leads").delete().eq("campaign_id", campaignId)

      const leads = fullResults.rows.map((row) => ({
        campaign_id: campaignId,
        source_data: row,
      }))

      // Insert in batches of 100
      for (let i = 0; i < leads.length; i += 100) {
        const batch = leads.slice(i, i + 100)
        await db.from("leads").insert(batch)
      }

      await updateCampaign(campaignId, {
        status: "enriching",
        candidate_count: fullResults.totalRows,
      })
    })

    // =========================================================================
    // PHASE 3: Enrichment (LeadMagic email finder)
    // =========================================================================
    // Uses only existing DB columns: leads.email, leads.email_status
    // Logs to debug_log for audit trail

    // Fetch all leads for this campaign that need enrichment
    const allLeads = await step.run("fetch-leads-for-enrichment", async () => {
      const { data } = await db
        .from("leads")
        .select("id, source_data")
        .eq("campaign_id", campaignId)
        .is("email", null)
        .order("created_at", { ascending: true })
      return data ?? []
    })

    const findPersonal = brief.enrich_personal_emails === true

    // ── Pre-flight: credit balance + the hard per-run cap ─────────────────
    // Cap = min(worst-case waterfall cost, absolute ceiling, available balance).
    // This is the guardrail that guarantees a run can't drain the account.
    const budget = await step.run("leadmagic-preflight", async () => {
      const balance = await getCreditBalance()
      let cap = Math.min(
        Math.ceil(allLeads.length * CREDIT_CAP_PER_LEAD),
        ABSOLUTE_MAX_CREDITS
      )
      // balance === -1 means the balance check failed; don't block, just cap to ceiling
      if (balance === 0) return { cap: 0, balance, blocked: true }
      if (balance > 0) cap = Math.min(cap, balance)
      return { cap, balance, blocked: false }
    })

    if (budget.blocked) {
      await step.run("enrichment-no-credits", async () => {
        await db.from("debug_log").insert({
          campaign_id: campaignId,
          step: "enrichment_failed",
          prompt: "Pre-flight credit check",
          response: JSON.stringify({ error: "Out of LeadMagic credits — top up at leadmagic.io/billing" }),
          model: "leadmagic",
        })
        await updateCampaign(campaignId, { status: "failed", enriched_count: 0, valid_count: 0 })
      })
      return { status: "failed", campaignId, reason: "Out of LeadMagic credits" }
    }

    let enrichedTotal = 0
    let validTotal = 0
    let creditsUsed = 0
    const runCap = budget.cap
    const totalBatches = Math.ceil(allLeads.length / ENRICH_BATCH_SIZE)

    let enrichmentFailed = false
    let cappedOut = false

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      // Stop if the credit cap is reached
      if (creditsUsed >= runCap) {
        cappedOut = true
        break
      }

      // Check for cancellation before each batch
      const cancelled = await step.run(`check-cancel-${batchIdx}`, async () => {
        const { data } = await db
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .single()
        return data?.status === "cancelled"
      })
      if (cancelled) {
        return { status: "cancelled", reason: "Cancelled by user during enrichment" }
      }

      const batchStart = batchIdx * ENRICH_BATCH_SIZE
      const batchLeads = allLeads.slice(batchStart, batchStart + ENRICH_BATCH_SIZE)
      const remainingBudget = runCap - creditsUsed

      const batchResult = await step.run(`enrich-batch-${batchIdx}`, async () => {
        const items = batchLeads.map((lead) => ({
          leadId: lead.id as string,
          sourceData: lead.source_data as Record<string, unknown>,
        }))

        try {
          const { results, creditsUsed: spent, stoppedAtCap } =
            await enrichBatchWaterfall(items, {
              findPersonal,
              creditBudget: remainingBudget,
            })

          let batchEnriched = 0
          let batchValid = 0

          for (const { leadId, result } of results) {
            if (result.email) {
              await db
                .from("leads")
                .update({
                  email: result.email,
                  email_status: result.email_status ?? "unknown",
                })
                .eq("id", leadId)
              batchEnriched++
              if (result.email_status === "valid") batchValid++
            }
            await db.from("debug_log").insert({
              campaign_id: campaignId,
              step: "leadmagic_enrich",
              prompt: JSON.stringify({ leadId, source: result.source }),
              response: JSON.stringify(result.raw),
              model: `leadmagic/${result.source}`,
            })
          }

          return {
            enriched: batchEnriched,
            valid: batchValid,
            credits: spent,
            stoppedAtCap,
            error: null as string | null,
          }
        } catch (err) {
          const reason =
            err instanceof LeadMagicApiError
              ? err.userFacingReason
              : err instanceof Error
                ? err.message
                : "Unknown enrichment error"

          await db.from("debug_log").insert({
            campaign_id: campaignId,
            step: "enrichment_failed",
            prompt: `Batch ${batchIdx} failed after enriching ${enrichedTotal} leads`,
            response: JSON.stringify({
              error: reason,
              statusCode: err instanceof LeadMagicApiError ? err.statusCode : null,
            }),
            model: "leadmagic",
          })
          await updateCampaign(campaignId, {
            status: "failed",
            enriched_count: enrichedTotal,
            valid_count: validTotal,
          })
          return { enriched: 0, valid: 0, credits: 0, stoppedAtCap: false, error: reason }
        }
      })

      if (batchResult.error) {
        enrichmentFailed = true
        break
      }

      enrichedTotal += batchResult.enriched
      validTotal += batchResult.valid
      creditsUsed += batchResult.credits

      await step.run(`update-enrich-progress-${batchIdx}`, async () => {
        await updateCampaign(campaignId, {
          enriched_count: enrichedTotal,
          valid_count: validTotal,
        })
      })

      if (batchResult.stoppedAtCap) {
        cappedOut = true
        break
      }
    }

    if (enrichmentFailed) {
      return { status: "failed", campaignId, enriched: enrichedTotal, valid: validTotal }
    }

    // Log enrichment summary (and note if we stopped at the credit cap)
    await step.run("finalize-enrichment", async () => {
      await updateCampaign(campaignId, {
        enriched_count: enrichedTotal,
        valid_count: validTotal,
      })
      await db.from("debug_log").insert({
        campaign_id: campaignId,
        step: cappedOut ? "enrichment_capped" : "enrichment_complete",
        prompt: `${allLeads.length} leads processed${cappedOut ? " (stopped at credit cap)" : ""}`,
        response: JSON.stringify({
          total: allLeads.length,
          enriched: enrichedTotal,
          valid: validTotal,
          credits_used: Math.round(creditsUsed * 100) / 100,
          credit_cap: runCap,
          stopped_at_cap: cappedOut,
          find_personal: findPersonal,
        }),
        model: "leadmagic",
      })
    })

    // =========================================================================
    // PHASE 4: Copy Generation + Review
    // =========================================================================

    // Fetch sample of enriched leads for copy generation
    const { data: sampleLeads } = await step.run("fetch-sample-leads", async () => {
      const { data } = await db
        .from("leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .not("email", "is", null)
        .limit(5)
      return { data }
    })

    const masterCopy = await step.run("generate-master-copy", async () => {
      const samples = (sampleLeads ?? []).map(
        (l: { source_data: Record<string, unknown> }) => l.source_data
      )
      return await generateMasterCopy(brief, samples)
    })

    await step.run("save-master-copy", async () => {
      await updateCampaign(campaignId, {
        status: "awaiting_copy_review",
        master_copy: masterCopy,
      })
    })

    // Wait for copy approval
    const copyReview = await step.waitForEvent("wait-copy-review", {
      event: "campaign/copy-reviewed",
      match: "data.campaignId",
      timeout: "7d",
    })

    if (!copyReview || copyReview.data.action !== "approve") {
      await updateCampaign(campaignId, { status: "cancelled" })
      return { status: "cancelled", reason: "Copy review not approved" }
    }

    // =========================================================================
    // PHASE 5: Personalization + Push to Instantly
    // =========================================================================
    await step.run("set-personalizing", async () => {
      await updateCampaign(campaignId, { status: "pushing" })
    })

    // ── 5a: Per-lead personalization ──────────────────────────────────────
    // Only personalize if brief requests it
    const shouldPersonalize =
      brief.personalization_depth === "opener" ||
      brief.personalization_depth === "opener_plus_company"

    if (shouldPersonalize) {
      // Fetch enriched leads that need personalization
      const leadsToPersonalize = await step.run(
        "fetch-leads-for-personalization",
        async () => {
          const { data } = await db
            .from("leads")
            .select("id, source_data, email")
            .eq("campaign_id", campaignId)
            .not("email", "is", null)
            .is("personalization", null)
            .order("created_at", { ascending: true })
          return data ?? []
        }
      )

      const totalPBatches = Math.ceil(
        leadsToPersonalize.length / PERSONALIZE_BATCH_SIZE
      )

      for (let batchIdx = 0; batchIdx < totalPBatches; batchIdx++) {
        const batchStart = batchIdx * PERSONALIZE_BATCH_SIZE
        const batchLeads = leadsToPersonalize.slice(
          batchStart,
          batchStart + PERSONALIZE_BATCH_SIZE
        )

        await step.run(`personalize-batch-${batchIdx}`, async () => {
          for (const lead of batchLeads) {
            try {
              const leadObj: Lead = {
                id: lead.id as string,
                campaign_id: campaignId,
                source_data: lead.source_data as Record<string, unknown>,
                email: lead.email as string,
                email_status: null,
                personalization: null,
                pushed_to_instantly_at: null,
                instantly_lead_id: null,
                created_at: "",
              }

              const personalization = await generatePersonalization(
                brief,
                leadObj
              )

              await db
                .from("leads")
                .update({ personalization })
                .eq("id", lead.id)
            } catch (err) {
              // Log failure but don't block the batch
              await db.from("debug_log").insert({
                campaign_id: campaignId,
                step: "personalization_error",
                prompt: JSON.stringify(lead.source_data),
                response:
                  err instanceof Error ? err.message : "Unknown error",
                model: "anthropic/claude-sonnet-4-6",
              })
            }
          }
        })
      }
    }

    // ── 5b: Push to Instantly ─────────────────────────────────────────────
    // Fetch all pushable leads (have email, not yet pushed)
    const leadsToPush = await step.run("fetch-leads-for-push", async () => {
      const { data } = await db
        .from("leads")
        .select("id, source_data, email, personalization")
        .eq("campaign_id", campaignId)
        .not("email", "is", null)
        .is("pushed_to_instantly_at", null)
        .order("created_at", { ascending: true })
      return data ?? []
    })

    const instantlyCampaignId = brief.instantly_campaign_id
    let totalPushed = 0

    if (leadsToPush.length > 0 && instantlyCampaignId) {
      const totalPushBatches = Math.ceil(
        leadsToPush.length / INSTANTLY_PUSH_BATCH_SIZE
      )

      for (let batchIdx = 0; batchIdx < totalPushBatches; batchIdx++) {
        const batchStart = batchIdx * INSTANTLY_PUSH_BATCH_SIZE
        const batchLeads = leadsToPush.slice(
          batchStart,
          batchStart + INSTANTLY_PUSH_BATCH_SIZE
        )

        const pushResult = await step.run(
          `push-instantly-batch-${batchIdx}`,
          async () => {
            // Format leads for Instantly
            const instantlyLeads: InstantlyLead[] = batchLeads.map((lead) => {
              const src = lead.source_data as Record<string, unknown>
              const personalization =
                lead.personalization as LeadPersonalization | null

              // Extract name fields from source data
              const firstName =
                str(src.first_name) ||
                str(src.person_first_name_unanalyzed) ||
                splitFirst(str(src.full_name) || str(src.person_name))
              const lastName =
                str(src.last_name) ||
                str(src.person_last_name_unanalyzed) ||
                splitLast(str(src.full_name) || str(src.person_name))
              const companyName =
                str(src.company_name) ||
                str(src.sanitized_organization_name_unanalyzed)
              const jobTitle =
                str(src.title) ||
                str(src.person_title) ||
                str(src.job_title)

              return {
                email: lead.email as string,
                first_name: firstName,
                last_name: lastName,
                company_name: companyName,
                job_title: jobTitle,
                custom_variables: {
                  first_line: personalization?.first_line ?? "",
                  company_note: personalization?.company_note ?? "",
                  first_name: firstName ?? "",
                  company_name: companyName ?? "",
                },
              }
            })

            const result = await pushLeadsToInstantly(
              instantlyCampaignId,
              instantlyLeads
            )

            // Mark leads as pushed
            const pushedAt = new Date().toISOString()
            const leadIds = batchLeads.map((l) => l.id as string)
            for (let i = 0; i < leadIds.length; i += 100) {
              const chunk = leadIds.slice(i, i + 100)
              await db
                .from("leads")
                .update({ pushed_to_instantly_at: pushedAt })
                .in("id", chunk)
            }

            return { pushed: batchLeads.length, result }
          }
        )

        totalPushed += pushResult.pushed
      }

      // Log push summary
      await step.run("log-push-summary", async () => {
        await db.from("debug_log").insert({
          campaign_id: campaignId,
          step: "instantly_push_complete",
          prompt: `${leadsToPush.length} leads to push`,
          response: JSON.stringify({
            total: leadsToPush.length,
            pushed: totalPushed,
            instantly_campaign_id: instantlyCampaignId,
          }),
          model: "instantly/v2",
        })
      })
    }

    // ── Complete ──────────────────────────────────────────────────────────
    await step.run("complete", async () => {
      await updateCampaign(campaignId, {
        status: "completed",
        instantly_campaign_id: instantlyCampaignId || null,
        completed_at: new Date().toISOString(),
      })
    })

    return {
      status: "completed",
      campaignId,
      enriched: enrichedTotal,
      valid: validTotal,
      personalized: shouldPersonalize ? leadsToPush.length : 0,
      pushed: totalPushed,
    }
  }
)
