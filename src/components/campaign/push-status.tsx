import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Campaign } from "@/types"

export function PushStatus({ campaign }: { campaign: Campaign }) {
  const isCompleted = campaign.status === "completed"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isCompleted ? "Campaign Complete" : "Pushing to Instantly..."}
          <Badge className={isCompleted ? "bg-green-600" : "bg-blue-600"}>
            {isCompleted ? "Done" : "In Progress"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">
              {campaign.candidate_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">Candidates</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {campaign.enriched_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">Enriched</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {campaign.valid_count?.toLocaleString() ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">Valid Emails</p>
          </div>
        </div>

        {isCompleted && campaign.instantly_campaign_id && (
          <div className="rounded-lg bg-zinc-900 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Leads pushed to Instantly campaign
            </p>
            <p className="mt-1 font-mono text-sm">
              {campaign.instantly_campaign_id}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Go to Instantly to configure sending and launch.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
