"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { submitVolumeSelection } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

export function VolumePicker({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const maxCandidates = campaign.candidate_count ?? 1000
  const maxAllowed = Math.min(maxCandidates, 1000)
  const [enrichCount, setEnrichCount] = useState(Math.min(200, maxAllowed))
  const [loading, setLoading] = useState(false)

  // Clamp to [1, maxAllowed] so tiny test batches (e.g. 5) are allowed
  function setClamped(n: number) {
    const v = Math.round(n)
    setEnrichCount(Math.max(1, Math.min(maxAllowed, Number.isFinite(v) ? v : 1)))
  }

  const quickPicks = [5, 25, 100, maxAllowed].filter(
    (n, i, arr) => n <= maxAllowed && arr.indexOf(n) === i
  )

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
          color: "rgba(0, 0, 0,0.45)",
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
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-3">
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
            <span className="eyebrow" style={{ color: "rgba(0, 0, 0,0.4)" }}>
              Contacts to verify
            </span>
          </div>
          {/* Precise number input */}
          <input
            type="number"
            min={1}
            max={maxAllowed}
            value={enrichCount}
            onChange={(e) => setClamped(Number(e.target.value))}
            style={{
              width: "6rem",
              padding: "0.55rem 0.75rem",
              textAlign: "right",
              border: "1px solid var(--line-strong)",
              background: "var(--paper)",
              color: "var(--ink)",
              fontFamily: "var(--sans)",
              fontSize: "1rem",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--wsg-camel)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
          />
        </div>

        {/* Quick picks — including a 5-lead test batch */}
        <div className="mb-6 flex flex-wrap gap-2">
          {quickPicks.map((n) => (
            <button
              key={n}
              onClick={() => setClamped(n)}
              className="transition-all duration-200"
              style={{
                padding: "0.4rem 0.9rem",
                border: `1px solid ${enrichCount === n ? "var(--wsg-camel)" : "var(--line)"}`,
                background: enrichCount === n ? "var(--wsg-blush)" : "transparent",
                color: enrichCount === n ? "#a23a4d" : "var(--ink-muted)",
                fontFamily: "var(--sans)",
                fontSize: "0.74rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {n === 5 ? "Test 5" : n === maxAllowed ? `All ${n.toLocaleString()}` : n.toLocaleString()}
            </button>
          ))}
        </div>

        <Slider
          value={[enrichCount]}
          onValueChange={(v) => setClamped(Array.isArray(v) ? v[0] : v)}
          min={1}
          max={maxAllowed}
          step={1}
        />
        <div className="mt-3 flex justify-between">
          <span style={{ fontSize: "0.72rem", color: "rgba(0, 0, 0,0.42)" }}>
            1
          </span>
          <span style={{ fontSize: "0.72rem", color: "rgba(0, 0, 0,0.42)" }}>
            {maxAllowed.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Cost estimate — cream panel with a camel rule */}
      <div
        className="panel-cream mb-10"
        style={{ padding: "1.4rem 1.6rem", borderLeft: "3px solid var(--wsg-camel)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow !text-[0.6rem]">Estimated cost</span>
          <span className="pill pill--camel">~{enrichCount} credits</span>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 300, lineHeight: 1.6 }}>
          1 LeadMagic credit per lookup. Not every lookup finds an email — typical
          hit rate is 40–60%, so expect roughly{" "}
          <strong style={{ fontWeight: 600, color: "var(--ink)" }}>
            {Math.round(enrichCount * 0.5)} verified
          </strong>{" "}
          emails.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="wsg-btn-camel w-full"
      >
        {loading
          ? "Starting verification..."
          : `Verify ${enrichCount} contacts →`}
      </button>
    </div>
  )
}
