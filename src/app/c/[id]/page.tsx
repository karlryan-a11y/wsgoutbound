import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import type { Campaign, CampaignStatus } from "@/types"
import { SqlReview } from "@/components/campaign/sql-review"
import { VolumePicker } from "@/components/campaign/volume-picker"
import { CopyReview } from "@/components/campaign/copy-review"
import { PushStatus } from "@/components/campaign/push-status"
import { LiveProgress } from "@/components/campaign/live-progress"
import { PipelineStepper } from "@/components/campaign/pipeline-stepper"

export const dynamic = "force-dynamic"

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Starting",
  awaiting_sql_review: "Review Audience",
  querying: "Finding Contacts",
  awaiting_volume: "Choose Volume",
  enriching: "Verifying Emails",
  awaiting_copy_review: "Review Sequence",
  pushing: "Sending to Instantly",
  completed: "Complete",
  failed: "Failed",
  cancelled: "Stopped",
}

const statusAccent: Record<CampaignStatus, string> = {
  draft: "rgba(0, 0, 0,0.3)",
  awaiting_sql_review: "#BE7B44",
  querying: "#7FB5CB",
  awaiting_volume: "#BE7B44",
  enriching: "#7FB5CB",
  awaiting_copy_review: "#BE7B44",
  pushing: "#7FB5CB",
  completed: "#2D500D",
  failed: "#C30319",
  cancelled: "rgba(0, 0, 0,0.2)",
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
    <div
      className="mx-auto w-full max-w-[1400px]"
      style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 6rem)" }}
    >
      {/* Back link */}
      <Link
        href="/"
        className="nav-link eyebrow mb-12 inline-block"
        style={{ color: "rgba(0, 0, 0,0.35)" }}
      >
        &larr; Back to campaigns
      </Link>

      {/* Campaign header */}
      <div className="mb-16 flex items-end justify-between">
        <div>
          <span className="eyebrow mb-4 block">Campaign</span>
          <h1 style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}>{c.name}</h1>
          <p
            className="mt-3"
            style={{
              fontSize: "1rem",
              color: "rgba(0, 0, 0,0.45)",
              fontWeight: 300,
              maxWidth: "48ch",
            }}
          >
            {c.brief.persona}
          </p>
        </div>
        <span
          style={{
            fontFamily: "var(--sans)",
            fontSize: "0.72rem",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: statusAccent[c.status],
          }}
        >
          {statusLabels[c.status]}
        </span>
      </div>

      {/* Pipeline stepper */}
      <PipelineStepper status={c.status} />

      {/* Divider */}
      <hr className="wsg-divider mb-12" />

      {/* Active review stages */}
      {c.status === "awaiting_sql_review" && <SqlReview campaign={c} />}
      {c.status === "awaiting_volume" && <VolumePicker campaign={c} />}
      {c.status === "awaiting_copy_review" && <CopyReview campaign={c} />}
      {c.status === "completed" && <PushStatus campaign={c} />}

      {/* Processing states + error/cancelled — live progress polling */}
      {(c.status === "draft" ||
        c.status === "querying" ||
        c.status === "enriching" ||
        c.status === "pushing" ||
        c.status === "failed" ||
        c.status === "cancelled") && (
        <LiveProgress campaignId={c.id} />
      )}
    </div>
  )
}
