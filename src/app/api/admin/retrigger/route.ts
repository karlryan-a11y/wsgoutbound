import { NextResponse } from "next/server"
import { inngest } from "@/lib/inngest/client"
import { supabaseServer } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { campaignId, event, data } = await req.json()

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 })
  }

  const eventName = event || "campaign/submitted"

  // Verify campaign exists
  const db = supabaseServer()
  const { data: campaign } = await db
    .from("campaigns")
    .select("id, status, name")
    .eq("id", campaignId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Send the event (merge any extra data, e.g. review action/feedback/volume)
  await inngest.send({
    name: eventName,
    data: { campaignId, ...(data || {}) },
  })

  return NextResponse.json({
    ok: true,
    campaignId,
    event: eventName,
    campaignStatus: campaign.status,
  })
}
