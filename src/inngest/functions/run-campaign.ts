import { inngest } from "@/lib/inngest/client"
import { supabaseServer } from "@/lib/supabase/server"
import { generateSql, refineSqlWithFeedback } from "@/lib/anthropic/generate-sql"
import { generateMasterCopy, generatePersonalization } from "@/lib/anthropic/generate-copy"
import { runQuery } from "@/lib/bigquery/client"
import { submitBulkEmailFinder, getBulkJobStatus, getBulkJobResults } from "@/lib/leadmagic/client"
import { pushLeadsToInstantly } from "@/lib/instantly/client"
import type { CampaignBrief, SqlVersion, Lead } from "@/types"

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

      // Save SQL version
      const newVersion: SqlVersion = {
        sql: sqlResult.sql,
        reasoning: sqlResult.reasoning,
        row_count: queryResult.totalRows,
        sample: queryResult.rows,
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
        // Refine with feedback
        const refined = await step.run("refine-sql", async () => {
          return await refineSqlWithFeedback(
            brief,
            sqlVersions,
            review.data.feedback as string
          )
        })

        const refinedQueryResult = await step.run(
          "run-refined-bq",
          async () => {
            return await runQuery(refined.sql, { limit: 25 })
          }
        )

        const refinedVersion: SqlVersion = {
          sql: refined.sql,
          reasoning: refined.reasoning,
          feedback: review.data.feedback as string,
          row_count: refinedQueryResult.totalRows,
          sample: refinedQueryResult.rows,
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
    // PHASE 3: Enrichment (LeadMagic)
    // =========================================================================
    // TODO: Wire in when LeadMagic key is available
    // For now, skip enrichment and move to copy generation

    // =========================================================================
    // PHASE 4: Copy Generation + Review
    // =========================================================================
    const { data: leads } = await step.run("fetch-leads", async () => {
      const { data } = await db
        .from("leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .limit(5)
      return { data }
    })

    const masterCopy = await step.run("generate-master-copy", async () => {
      const sampleLeads = (leads ?? []).map(
        (l: Lead) => l.source_data
      )
      return await generateMasterCopy(brief, sampleLeads)
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

    return { status: "completed", campaignId }
  }
)
