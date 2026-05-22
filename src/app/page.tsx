import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Campaign, CampaignStatus } from "@/types"

export const dynamic = "force-dynamic"

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-white/[0.06] text-white/40",
  awaiting_sql_review: "bg-[#BE7B44]/15 text-[#BE7B44]",
  querying: "bg-[#7FB5CB]/15 text-[#7FB5CB]",
  awaiting_volume: "bg-[#BE7B44]/15 text-[#BE7B44]",
  enriching: "bg-[#7FB5CB]/15 text-[#7FB5CB]",
  awaiting_copy_review: "bg-[#BE7B44]/15 text-[#BE7B44]",
  pushing: "bg-[#7FB5CB]/15 text-[#7FB5CB]",
  completed: "bg-[#2D500D]/20 text-[#5A9A2F]",
  failed: "bg-[#C30319]/15 text-[#C30319]",
  cancelled: "bg-white/[0.06] text-white/40",
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
          <p className="mt-1 text-sm text-white/50">
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
        <Card className="border-dashed border-[#BE7B44]/15">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <p className="mb-1 text-lg text-white/60">
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(campaigns as Campaign[]).map((campaign) => (
            <Link key={campaign.id} href={`/c/${campaign.id}`}>
              <Card className="border-[#BE7B44]/[0.08] transition-all hover:border-[#BE7B44]/20 hover:bg-white/[0.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium text-white">
                    {campaign.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={`${statusColors[campaign.status]} border-0 text-xs font-medium`}
                  >
                    {statusLabels[campaign.status]}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm text-white/50">
                    <span>{campaign.brief?.persona || "No persona set"}</span>
                    {campaign.candidate_count != null && (
                      <span className="text-white/40">
                        {campaign.candidate_count.toLocaleString()} candidates
                      </span>
                    )}
                    {campaign.valid_count != null && (
                      <span className="text-[#5A9A2F]">
                        {campaign.valid_count.toLocaleString()} valid
                      </span>
                    )}
                    <span className="ml-auto text-xs text-white/30">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
