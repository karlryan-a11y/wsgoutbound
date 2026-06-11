import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = supabaseServer()

  const { data: campaign, error } = await db
    .from("campaigns")
    .select("status, candidate_count, enriched_count, valid_count, updated_at")
    .eq("id", id)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Count leads with personalization
  const { count: personalizedCount } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id)
    .not("personalization", "is", null)

  // Count pushed leads
  const { count: pushedCount } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id)
    .not("pushed_to_instantly_at", "is", null)

  // Total leads for this campaign (= the enrichment volume the user selected)
  const { count: totalLeads } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id)

  // Fetch recently enriched leads for the live table (last 50 with emails)
  const { data: recentLeads } = await db
    .from("leads")
    .select("id, source_data, email, email_status, created_at")
    .eq("campaign_id", id)
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(50)

  // If campaign failed, get the failure reason from debug_log
  let failureReason: string | null = null
  if (campaign.status === "failed") {
    const { data: failLog } = await db
      .from("debug_log")
      .select("response")
      .eq("campaign_id", id)
      .eq("step", "enrichment_failed")
      .order("created_at", { ascending: false })
      .limit(1)

    if (failLog?.[0]?.response) {
      try {
        const parsed = JSON.parse(failLog[0].response as string)
        failureReason = parsed.error || "Unknown error"
      } catch {
        failureReason = String(failLog[0].response)
      }
    }
  }

  return NextResponse.json({
    status: campaign.status,
    candidate_count: campaign.candidate_count,
    enriched_count: campaign.enriched_count ?? 0,
    valid_count: campaign.valid_count ?? 0,
    personalized_count: personalizedCount ?? 0,
    pushed_count: pushedCount ?? 0,
    total_leads: totalLeads ?? 0,
    updated_at: campaign.updated_at,
    failure_reason: failureReason,
    recent_leads: (recentLeads ?? []).map((l) => {
      const src = l.source_data as Record<string, unknown>
      return {
        id: l.id,
        name:
          src.full_name ||
          src.person_name ||
          `${src.first_name || ""} ${src.last_name || ""}`.trim() ||
          "—",
        title: src.job_title || src.person_title || src.title || "—",
        company:
          src.company_name ||
          src.sanitized_organization_name_unanalyzed ||
          "—",
        email: l.email,
        email_status: l.email_status,
      }
    }),
  })
}
