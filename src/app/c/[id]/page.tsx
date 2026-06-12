import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import type { Campaign } from "@/types"
import { CampaignWorkspace } from "@/components/campaign/campaign-workspace"
import { StatusPill } from "@/components/ui/status-pill"

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
    <div
      className="mx-auto w-full max-w-[1400px]"
      style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 6rem)" }}
    >
      {/* Back link */}
      <Link
        href="/"
        className="nav-link eyebrow mb-12 inline-block"
        style={{ color: "rgba(0, 0, 0,0.5)" }}
      >
        &larr; Back to campaigns
      </Link>

      {/* Campaign header — blush accent block */}
      <div
        className="accent-block mb-12"
        style={{ padding: "clamp(1.75rem, 3.5vw, 2.75rem) clamp(1.5rem, 3.5vw, 2.75rem)" }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow-num mb-4">
              <b>—</b> Campaign
            </p>
            <h1 style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}>{c.name}</h1>
            <p
              className="mt-4"
              style={{
                fontSize: "1.02rem",
                color: "var(--ink-soft)",
                fontWeight: 300,
                maxWidth: "52ch",
                lineHeight: 1.6,
              }}
            >
              {c.brief.persona}
            </p>
          </div>
          <StatusPill status={c.status} />
        </div>
      </div>

      {/* Clickable stepper + per-stage views (live action or read-only summary) */}
      <CampaignWorkspace campaign={c} />
    </div>
  )
}
