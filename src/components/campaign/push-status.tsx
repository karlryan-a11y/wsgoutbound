import { Badge } from "@/components/ui/badge"
import type { Campaign } from "@/types"

export function PushStatus({ campaign }: { campaign: Campaign }) {
  const isCompleted = campaign.status === "completed"

  return (
    <div className="rounded-xl bg-[#BE7B44] p-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-lg font-medium text-white">
          {isCompleted ? "Campaign Complete" : "Pushing to Instantly..."}
        </h2>
        <Badge className={`border-0 text-xs ${
          isCompleted ? "bg-[#2D500D] text-white" : "bg-white/20 text-white"
        }`}>
          {isCompleted ? "Done" : "In Progress"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-black/20 p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {campaign.candidate_count?.toLocaleString() ?? "—"}
          </p>
          <p className="text-sm text-white/50">Candidates</p>
        </div>
        <div className="rounded-lg bg-black/20 p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {campaign.enriched_count?.toLocaleString() ?? "—"}
          </p>
          <p className="text-sm text-white/50">Enriched</p>
        </div>
        <div className="rounded-lg bg-black/20 p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {campaign.valid_count?.toLocaleString() ?? "—"}
          </p>
          <p className="text-sm text-white/50">Valid Emails</p>
        </div>
      </div>

      {isCompleted && campaign.instantly_campaign_id && (
        <div className="mt-4 rounded-lg bg-black/20 p-5 text-center">
          <p className="text-sm text-white/60">
            Leads pushed to Instantly campaign
          </p>
          <p className="mt-1 font-mono text-sm text-white/80">
            {campaign.instantly_campaign_id}
          </p>
          <p className="mt-3 text-sm text-white/40">
            Go to Instantly to configure sending and launch.
          </p>
        </div>
      )}
    </div>
  )
}
