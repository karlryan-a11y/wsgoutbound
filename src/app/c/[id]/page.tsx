import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/types"
import { SqlReview } from "@/components/campaign/sql-review"
import { VolumePicker } from "@/components/campaign/volume-picker"
import { CopyReview } from "@/components/campaign/copy-review"
import { PushStatus } from "@/components/campaign/push-status"

export const dynamic = "force-dynamic"

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = supabaseServer()

  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single()

  if (!campaign) notFound()

  const c = campaign as Campaign

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 block text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to campaigns
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted-foreground">{c.brief.persona}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {c.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Render stage component based on status */}
      {c.status === "awaiting_sql_review" && (
        <SqlReview campaign={c} />
      )}

      {c.status === "awaiting_volume" && (
        <VolumePicker campaign={c} />
      )}

      {c.status === "awaiting_copy_review" && (
        <CopyReview campaign={c} />
      )}

      {(c.status === "pushing" || c.status === "completed") && (
        <PushStatus campaign={c} />
      )}

      {(c.status === "draft" || c.status === "querying" || c.status === "enriching") && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-16">
          <div className="mb-2 text-4xl">&#9881;</div>
          <p className="text-lg text-muted-foreground">
            Processing — {c.status.replace(/_/g, " ")}...
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This page will update when the next step is ready.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      )}

      {(c.status === "failed" || c.status === "cancelled") && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-red-900 py-16">
          <p className="text-lg text-muted-foreground">
            Campaign {c.status}
          </p>
        </div>
      )}
    </div>
  )
}
