import { inngest } from "@/lib/inngest/client"
import { supabaseServer } from "@/lib/supabase/server"
import { generateSql, refineSqlWithFeedback } from "@/lib/anthropic/generate-sql"
import { generateMasterCopy } from "@/lib/anthropic/generate-copy"
import { runQuery } from "@/lib/bigquery/client"
import { enrichBatch, extractLeadForEnrichment } from "@/lib/leadmagic/client"
import type { CampaignBrief, SqlVersion } from "@/types"

const ENRICH_BATCH_SIZE = 50 // leads per Inngest step (at 5 RPS ≈ 11 seconds)

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

export const runCampaign = inngest.createFunction(
  { id: "run-campaign", retries: 2, triggers: [{ event: "campaign/submitted" }] },
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

      // Run query to get sample + count
      const queryResult = await step.run("run-bq-sample", async () => {
        return await runQuery(sqlResult.sql, { limit: 25 })
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
        row_count: queryResult.totalRows,
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
          candidate_count: queryResult.totalRows,
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
          return await runQuery(refined.sql, { limit: 25 })
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
          row_count: refinedQueryResult.totalRows,
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

    // Run full query and store leads
    const approvedSql = sqlVersions[sqlVersions.length - 1].sql
    const fullResults = await step.run("run-full-query", async () => {
      return await runQuery(approvedSql, { limit: enrichCount })
    })

    await step.run("store-leads", async () => {
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

    // Process in batches of ENRICH_BATCH_SIZE (at 5 RPS, 50 leads ≈ 11s)
    let enrichedTotal = 0
    let validTotal = 0
    let creditsUsed = 0
    const totalBatches = Math.ceil(allLeads.length / ENRICH_BATCH_SIZE)

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batchStart = batchIdx * ENRICH_BATCH_SIZE
      const batchLeads = allLeads.slice(batchStart, batchStart + ENRICH_BATCH_SIZE)

      const batchResult = await step.run(
        `enrich-batch-${batchIdx}`,
        async () => {
          // Extract enrichment requests from lead source data
          const requests = batchLeads.map((lead) => ({
            leadId: lead.id as string,
            request: extractLeadForEnrichment(
              lead.source_data as Record<string, unknown>
            ),
          }))

          // Filter: only enrich leads we have name + company for
          const enrichable = requests.filter((r) => r.request !== null)

          if (enrichable.length === 0) {
            return { enriched: 0, valid: 0, credits: 0 }
          }

          // Call LeadMagic with rate limiting
          const results = await enrichBatch(
            enrichable.map((e) => e.request!)
          )

          // Update each lead in Supabase (uses existing columns only)
          let batchEnriched = 0
          let batchValid = 0
          let batchCredits = 0

          for (let i = 0; i < enrichable.length; i++) {
            const leadId = enrichable[i].leadId
            const result = results[i]

            // Update lead with found email (or leave null)
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

            batchCredits += result.credits_used

            // Log to debug_log for audit trail
            await db.from("debug_log").insert({
              campaign_id: campaignId,
              step: "leadmagic_enrich",
              prompt: JSON.stringify(enrichable[i].request),
              response: JSON.stringify(result.raw),
              model: "leadmagic/email-finder",
              tokens_in: 0,
              tokens_out: 0,
            })
          }

          return {
            enriched: batchEnriched,
            valid: batchValid,
            credits: batchCredits,
          }
        }
      )

      enrichedTotal += batchResult.enriched
      validTotal += batchResult.valid
      creditsUsed += batchResult.credits

      // Update campaign progress after each batch
      await step.run(`update-enrich-progress-${batchIdx}`, async () => {
        await updateCampaign(campaignId, {
          enriched_count: enrichedTotal,
          valid_count: validTotal,
        })
      })
    }

    // Log enrichment summary
    await step.run("finalize-enrichment", async () => {
      await updateCampaign(campaignId, {
        enriched_count: enrichedTotal,
        valid_count: validTotal,
      })

      await db.from("debug_log").insert({
        campaign_id: campaignId,
        step: "enrichment_complete",
        prompt: `${allLeads.length} leads processed`,
        response: JSON.stringify({
          total: allLeads.length,
          enriched: enrichedTotal,
          valid: validTotal,
          credits_used: creditsUsed,
        }),
        model: "leadmagic/email-finder",
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
    await step.run("set-pushing", async () => {
      await updateCampaign(campaignId, { status: "pushing" })
    })

    // TODO: Per-lead personalization fan-out
    // TODO: Push to Instantly

    await step.run("complete", async () => {
      await updateCampaign(campaignId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      })
    })

    return {
      status: "completed",
      campaignId,
      enriched: enrichedTotal,
      valid: validTotal,
    }
  }
)
