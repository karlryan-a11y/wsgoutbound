"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitCopyReview } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

export function CopyReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const masterCopy = campaign.master_copy

  async function handleApprove() {
    setLoading(true)
    await submitCopyReview(campaign.id, "approve")

    // Poll until status changes from awaiting_copy_review
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaign/${campaign.id}/progress`, {
          cache: "no-store",
        })
        if (res.ok) {
          const d = await res.json()
          if (d.status !== "awaiting_copy_review") {
            clearInterval(poll)
            router.refresh()
          }
        }
      } catch {
        // keep polling
      }
    }, 2000)
  }

  async function handleReject() {
    setLoading(true)
    await submitCopyReview(campaign.id, "reject")

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaign/${campaign.id}/progress`, {
          cache: "no-store",
        })
        if (res.ok) {
          const d = await res.json()
          if (d.status !== "awaiting_copy_review") {
            clearInterval(poll)
            router.refresh()
          }
        }
      } catch {
        // keep polling
      }
    }, 2000)
  }

  if (!masterCopy?.steps) {
    return (
      <div className="flex items-center gap-4 py-16">
        <div className="wsg-spinner" />
        <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
          Generating copy...
        </span>
      </div>
    )
  }

  return (
    <div>
      <span className="eyebrow mb-4 block">Copy Review</span>
      <h2
        className="mb-12"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
          fontWeight: 300,
        }}
      >
        Email Sequence
      </h2>

      {/* Email steps — numbered like services on main site */}
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {masterCopy.steps.map((step, i) => (
          <div
            key={i}
            style={{
              borderBottom: "1px solid var(--line)",
              padding: "2.5rem 0",
            }}
          >
            <div className="mb-4 flex items-center gap-4">
              <span
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                  color: "var(--wsg-muted)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="eyebrow"
                style={{ color: "rgba(255,255,255,0.56)", fontSize: "0.62rem" }}
              >
                {step.delay_days === 0
                  ? "Send Immediately"
                  : `+${step.delay_days} Days`}
              </span>
            </div>
            <h3
              className="mb-4"
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.35rem",
                fontWeight: 300,
                letterSpacing: "-0.005em",
              }}
            >
              {step.subject}
            </h3>
            <pre
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.92rem",
                fontWeight: 300,
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.74)",
                whiteSpace: "pre-wrap",
                maxWidth: "56ch",
              }}
            >
              {step.body}
            </pre>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-10 flex gap-4">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="wsg-btn-primary disabled:opacity-40"
        >
          Approve &amp; Push to Instantly
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="wsg-btn-muted disabled:opacity-40"
        >
          Reject &amp; Cancel
        </button>
      </div>
    </div>
  )
}
