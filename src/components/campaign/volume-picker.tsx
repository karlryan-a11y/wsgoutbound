"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { submitVolumeSelection } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

export function VolumePicker({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const maxCandidates = campaign.candidate_count ?? 1000
  const [enrichCount, setEnrichCount] = useState(
    Math.min(200, maxCandidates)
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    await submitVolumeSelection(campaign.id, enrichCount)

    // Poll until status changes from awaiting_volume, then refresh
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaign/${campaign.id}/progress`, {
          cache: "no-store",
        })
        if (res.ok) {
          const d = await res.json()
          if (d.status !== "awaiting_volume") {
            clearInterval(poll)
            router.refresh()
          }
        }
      } catch {
        // keep polling
      }
    }, 2000)
  }

  return (
    <div>
      <span className="eyebrow mb-4 block">How many to verify</span>
      <h2
        className="mb-3"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
          fontWeight: 300,
        }}
      >
        Choose verification volume
      </h2>
      <p
        className="mb-12"
        style={{
          fontSize: "1rem",
          color: "rgba(255,255,255,0.7)",
          fontWeight: 300,
        }}
      >
        {maxCandidates.toLocaleString()} contacts matched your search.
        Choose how many to verify with real email addresses.
      </p>

      {/* Volume display */}
      <div
        className="mb-10"
        style={{
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          padding: "2.5rem 0",
        }}
      >
        <div className="flex items-baseline gap-3 mb-8">
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(2.5rem, 4vw, 4rem)",
              fontWeight: 300,
              lineHeight: 1,
              color: "var(--wsg-camel)",
            }}
          >
            {enrichCount}
          </span>
          <span className="eyebrow" style={{ color: "rgba(255,255,255,0.62)" }}>
            Contacts to verify
          </span>
        </div>
        <Slider
          value={[enrichCount]}
          onValueChange={(v) => setEnrichCount(Array.isArray(v) ? v[0] : v)}
          min={10}
          max={Math.min(maxCandidates, 1000)}
          step={10}
        />
        <div className="mt-3 flex justify-between">
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.46)" }}>
            10
          </span>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.46)" }}>
            {Math.min(maxCandidates, 1000).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Cost estimate */}
      <div
        className="mb-10"
        style={{
          padding: "1.25rem 1.5rem",
          border: "1px solid var(--line)",
          background: "var(--surface-raised)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.68)", fontWeight: 300 }}>
            Estimated cost
          </span>
          <span style={{ fontSize: "0.95rem", color: "var(--wsg-camel)", fontWeight: 400 }}>
            ~{enrichCount} LeadMagic credits
          </span>
        </div>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.52)", fontWeight: 300 }}>
          1 credit per lookup. Not all lookups find an email — typical hit rate is 40–60%.
          Expected verified emails: ~{Math.round(enrichCount * 0.5)}
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="wsg-btn-primary w-full disabled:opacity-40"
      >
        {loading
          ? "Starting verification..."
          : `Verify ${enrichCount} contacts`}
      </button>
    </div>
  )
}
