"use server"

import { inngest } from "@/lib/inngest/client"

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
