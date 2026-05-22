import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Campaign, CampaignStatus } from "@/types"

export const dynamic = "force-dynamic"

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-white/20 text-white/60",
  awaiting_sql_review: "bg-white/20 text-white",
  querying: "bg-white/20 text-white/80",
  awaiting_volume: "bg-white/20 text-white",
  enriching: "bg-white/20 text-white/80",
  awaiting_copy_review: "bg-white/20 text-white",
  pushing: "bg-white/20 text-white/80",
  completed: "bg-[#2D500D] text-white",
  failed: "bg-[#C30319]/80 text-white",
  cancelled: "bg-white/20 text-white/60",
}

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Draft",
  awaiting_sql_review: "Review Query",
  querying: "Querying",
  awaiting_volume: "Pick Volume",
  enriching: "Enriching",
  awaiting_copy_review: "Review Copy",
  pushing: "Pushing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}

export default async function DashboardPage() {
  const db = supabaseServer()
  const { data: campaigns } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-3xl tracking-tight text-white">Campaigns</h2>
          <p className="mt-1 text-sm text-white/40">
            Manage your outbound email campaigns
          </p>
        </div>
        <Link href="/new">
          <Button className="bg-[#BE7B44] text-white hover:bg-[#A86A37]">
            New Campaign
          </Button>
        </Link>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-20">
          <p className="mb-1 text-lg text-white/50">
            No campaigns yet
          </p>
          <p className="mb-6 text-sm text-white/30">
            Create your first outbound campaign to get started
          </p>
          <Link href="/new">
            <Button className="bg-[#BE7B44] text-white hover:bg-[#A86A37]">
              Create Campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(campaigns as Campaign[]).map((campaign) => (
            <Link key={campaign.id} href={`/c/${campaign.id}`}>
              <div className="group rounded-xl bg-[#BE7B44] p-5 transition-all hover:bg-[#C9874F] hover:shadow-lg hover:shadow-[#BE7B44]/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">
                    {campaign.name}
                  </h3>
                  <Badge
                    className={`${statusColors[campaign.status]} border-0 text-xs font-medium`}
                  >
                    {statusLabels[campaign.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex gap-6 text-sm text-white/70">
                  <span>{campaign.brief?.persona || "No persona set"}</span>
                  {campaign.candidate_count != null && (
                    <span className="text-white/50">
                      {campaign.candidate_count.toLocaleString()} candidates
                    </span>
                  )}
                  {campaign.valid_count != null && (
                    <span className="text-white">
                      {campaign.valid_count.toLocaleString()} valid
                    </span>
                  )}
                  <span className="ml-auto text-xs text-white/40">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
