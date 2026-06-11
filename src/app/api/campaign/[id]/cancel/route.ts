import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = supabaseServer()

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, status")
    .eq("id", id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Only allow cancelling active processing states
  const cancellable = ["enriching", "pushing", "querying", "draft"]
  if (!cancellable.includes(campaign.status)) {
    return NextResponse.json(
      { error: `Cannot cancel campaign in ${campaign.status} status` },
      { status: 400 }
    )
  }

  await db
    .from("campaigns")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  return NextResponse.json({ ok: true, status: "cancelled" })
}
