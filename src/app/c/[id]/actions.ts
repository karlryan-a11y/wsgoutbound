"use server"

import { inngest } from "@/lib/inngest/client"
import { supabaseServer } from "@/lib/supabase/server"
import type { EmailStep } from "@/types"

// Persist edited email-sequence copy before approval. Personalization + push
// use campaign.master_copy, so saving here makes the edits take effect.
export async function saveCopy(campaignId: string, steps: EmailStep[]) {
  const db = supabaseServer()
  const { data: campaign } = await db
    .from("campaigns")
    .select("master_copy")
    .eq("id", campaignId)
    .single()

  const masterCopy = {
    ...(campaign?.master_copy ?? {}),
    steps,
  }

  const { error } = await db
    .from("campaigns")
    .update({ master_copy: masterCopy, updated_at: new Date().toISOString() })
    .eq("id", campaignId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function submitSqlReview(
  campaignId: string,
  action: "approve" | "refine",
  feedback?: string
) {
  await inngest.send({
    name: "campaign/sql-reviewed",
    data: { campaignId, action, feedback },
  })
}

export async function submitVolumeSelection(
  campaignId: string,
  enrichCount: number
) {
  await inngest.send({
    name: "campaign/volume-set",
    data: { campaignId, enrichCount },
  })
}

export async function submitCopyReview(
  campaignId: string,
  action: "approve" | "reject"
) {
  await inngest.send({
    name: "campaign/copy-reviewed",
    data: { campaignId, action },
  })
}
