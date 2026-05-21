import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { supabaseServer } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Campaign, CampaignStatus } from "@/types"

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-zinc-700",
  awaiting_sql_review: "bg-yellow-600",
  querying: "bg-blue-600",
  awaiting_volume: "bg-yellow-600",
  enriching: "bg-blue-600",
  awaiting_copy_review: "bg-yellow-600",
  pushing: "bg-blue-600",
  completed: "bg-green-600",
  failed: "bg-red-600",
  cancelled: "bg-zinc-600",
}

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Draft",
  awaiting_sql_review: "SQL Review",
  querying: "Querying",
  awaiting_volume: "Volume Pick",
  enriching: "Enriching",
  awaiting_copy_review: "Copy Review",
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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight">
              WSG Outbound
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/knowledge">
              <Button variant="ghost" size="sm">
                Knowledge
              </Button>
            </Link>
            <Link href="/instructions">
              <Button variant="ghost" size="sm">
                Rules
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container flex-1 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
            <p className="text-sm text-muted-foreground">
              Manage your outbound email campaigns
            </p>
          </div>
          <Link href="/new">
            <Button>New Campaign</Button>
          </Link>
        </div>

        {!campaigns || campaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="mb-4 text-lg text-muted-foreground">
                No campaigns yet
              </p>
              <Link href="/new">
                <Button>Create your first campaign</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(campaigns as Campaign[]).map((campaign) => (
              <Link key={campaign.id} href={`/c/${campaign.id}`}>
                <Card className="transition-colors hover:bg-zinc-900/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {campaign.name}
                    </CardTitle>
                    <Badge
                      className={`${statusColors[campaign.status]} text-white`}
                    >
                      {statusLabels[campaign.status]}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>
                        {campaign.brief?.persona || "No persona set"}
                      </span>
                      {campaign.candidate_count && (
                        <span>
                          {campaign.candidate_count.toLocaleString()} candidates
                        </span>
                      )}
                      {campaign.valid_count && (
                        <span>
                          {campaign.valid_count.toLocaleString()} valid emails
                        </span>
                      )}
                      <span>
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
