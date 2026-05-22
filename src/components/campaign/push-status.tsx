import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Campaign } from "@/types"

export function PushStatus({ campaign }: { campaign: Campaign }) {
  const isCompleted = campaign.status === "completed"

  return (
    <Card className="border-black/10 bg-black/[0.08]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          {isCompleted ? "Campaign Complete" : "Pushing to Instantly..."}
          <Badge
            className={
              isCompleted
                ? "bg-[#2D500D]/30 text-[#5A9A2F]"
                : "bg-[#7FB5CB]/20 text-[#7FB5CB]"
            }
          >
            {isCompleted ? "Done" : "In Progress"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border border-black/10 bg-black/[0.08] p-4">
            <p className="text-2xl font-bold text-white">
              {campaign.candidate_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-white/40">Candidates</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[0.08] p-4">
            <p className="text-2xl font-bold text-white">
              {campaign.enriched_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-white/40">Enriched</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[0.08] p-4">
            <p className="text-2xl font-bold text-[#5A9A2F]">
              {campaign.valid_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-white/40">Valid Emails</p>
          </div>
        </div>

        {isCompleted && campaign.instantly_campaign_id && (
          <div className="rounded-lg border border-black/10 bg-black/[0.06] p-5 text-center">
            <p className="text-sm text-white/50">
              Leads pushed to Instantly campaign
            </p>
            <p className="mt-1 font-mono text-sm text-white/70">
              {campaign.instantly_campaign_id}
            </p>
            <p className="mt-3 text-sm text-white/40">
              Go to Instantly to configure sending and launch.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
