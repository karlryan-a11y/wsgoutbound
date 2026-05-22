import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import type { Campaign, CampaignStatus } from "@/types"
import { RefreshButton } from "@/components/campaign/refresh-button"
import { SqlReview } from "@/components/campaign/sql-review"
import { VolumePicker } from "@/components/campaign/volume-picker"
import { CopyReview } from "@/components/campaign/copy-review"
import { PushStatus } from "@/components/campaign/push-status"

export const dynamic = "force-dynamic"

const statusStyles: Record<CampaignStatus, string> = {
  draft: "border-white/20 text-white/50",
  awaiting_sql_review: "border-[#BE7B44]/30 text-[#BE7B44]",
  querying: "border-[#7FB5CB]/30 text-[#7FB5CB]",
  awaiting_volume: "border-[#BE7B44]/30 text-[#BE7B44]",
  enriching: "border-[#7FB5CB]/30 text-[#7FB5CB]",
  awaiting_copy_review: "border-[#BE7B44]/30 text-[#BE7B44]",
  pushing: "border-[#7FB5CB]/30 text-[#7FB5CB]",
  completed: "border-[#2D500D]/30 text-[#5A9A2F]",
  failed: "border-[#C30319]/30 text-[#C30319]",
  cancelled: "border-white/20 text-white/50",
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
    <div className="container max-w-4xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 block text-sm text-white/30 transition-colors hover:text-white"
          >
            &larr; Back to campaigns
          </Link>
          <h1 className="text-3xl tracking-tight text-white">{c.name}</h1>
          <p className="mt-1 text-sm text-white/50">{c.brief.persona}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-sm ${statusStyles[c.status]}`}
        >
          {statusLabels[c.status]}
        </Badge>
      </div>

      {/* Render stage component based on status */}
      {c.status === "awaiting_sql_review" && <SqlReview campaign={c} />}

      {c.status === "awaiting_volume" && <VolumePicker campaign={c} />}

      {c.status === "awaiting_copy_review" && <CopyReview campaign={c} />}

      {(c.status === "pushing" || c.status === "completed") && (
        <PushStatus campaign={c} />
      )}

      {(c.status === "draft" ||
        c.status === "querying" ||
        c.status === "enriching") && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#BE7B44]/15 py-20">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#BE7B44]/20 border-t-[#BE7B44]" />
          <p className="text-lg text-white/80">
            {statusLabels[c.status]}
          </p>
          <p className="mt-1 text-sm text-white/40">
            This page will update when the next step is ready.
          </p>
          <RefreshButton />
        </div>
      )}

      {(c.status === "failed" || c.status === "cancelled") && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#C30319]/20 py-20">
          <p className="text-lg text-white/60">
            Campaign {c.status}
          </p>
        </div>
      )}
    </div>
  )
}
