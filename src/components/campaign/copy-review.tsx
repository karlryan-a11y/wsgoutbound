"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitCopyReview, saveCopy } from "@/app/c/[id]/actions"
import type { Campaign, EmailStep } from "@/types"

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.85rem",
  background: "var(--paper)",
  border: "1px solid var(--line-strong)",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
  fontSize: "0.95rem",
  fontWeight: 300,
  outline: "none",
}

export function CopyReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [steps, setSteps] = useState<EmailStep[]>(
    campaign.master_copy?.steps ?? []
  )
  const [dirty, setDirty] = useState(false)

  function updateStep(i: number, patch: Partial<EmailStep>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const res = await saveCopy(campaign.id, steps)
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(null), 2500)
    } else {
      alert(res.error || "Failed to save")
    }
  }

  function pollUntilLeavesReview() {
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

  async function handleApprove() {
    setLoading(true)
    // Save any pending edits first so the push uses the latest copy
    if (dirty) await saveCopy(campaign.id, steps)
    await submitCopyReview(campaign.id, "approve")
    pollUntilLeavesReview()
  }

  async function handleReject() {
    setLoading(true)
    await submitCopyReview(campaign.id, "reject")
    pollUntilLeavesReview()
  }

  if (!campaign.master_copy?.steps) {
    return (
      <div className="flex items-center gap-4 py-16">
        <div className="wsg-spinner" />
        <span style={{ color: "rgba(0, 0, 0,0.45)", fontWeight: 300 }}>
          Generating copy...
        </span>
      </div>
    )
  }

  return (
    <div>
      <span className="eyebrow-num mb-4 block">
        <b>—</b> Copy Review
      </span>
      <h2
        className="mb-3"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
          fontWeight: 300,
        }}
      >
        Email Sequence
      </h2>
      <p
        className="mb-8"
        style={{ fontSize: "0.95rem", color: "var(--ink-soft)", fontWeight: 300, maxWidth: "60ch" }}
      >
        Edit any subject or body below. Personalization tokens you can use:{" "}
        {["{{first_name}}", "{{company_name}}", "{{first_line}}", "{{company_note}}"].map(
          (t) => (
            <code
              key={t}
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.82rem",
                background: "var(--blush-faint)",
                padding: "0.1rem 0.35rem",
                marginRight: "0.3rem",
              }}
            >
              {t}
            </code>
          )
        )}
      </p>

      {/* Editable email steps */}
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{ borderBottom: "1px solid var(--line)", padding: "2rem 0" }}
          >
            <div className="mb-4 flex items-center gap-4">
              <span className="index-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex items-center gap-2">
                <span className="eyebrow !text-[0.6rem]">Send</span>
                <input
                  type="number"
                  min={0}
                  value={step.delay_days}
                  onChange={(e) =>
                    updateStep(i, { delay_days: Math.max(0, Number(e.target.value) || 0) })
                  }
                  style={{ ...inputStyle, width: "4.5rem", padding: "0.4rem 0.5rem", textAlign: "right" }}
                />
                <span className="eyebrow !text-[0.6rem]">
                  {step.delay_days === 0 ? "days (immediately)" : "days after start"}
                </span>
              </div>
            </div>

            <label className="eyebrow !text-[0.58rem] mb-1.5 block" style={{ color: "var(--ink-muted)" }}>
              Subject
            </label>
            <input
              value={step.subject}
              onChange={(e) => updateStep(i, { subject: e.target.value })}
              className="mb-4"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--wsg-camel)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            />

            <label className="eyebrow !text-[0.58rem] mb-1.5 block" style={{ color: "var(--ink-muted)" }}>
              Body
            </label>
            <textarea
              value={step.body}
              onChange={(e) => updateStep(i, { body: e.target.value })}
              rows={Math.max(5, step.body.split("\n").length + 1)}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
              onFocus={(e) => (e.target.style.borderColor = "var(--wsg-camel)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
            />
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="wsg-btn-ghost disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {savedAt && (
          <span style={{ fontSize: "0.82rem", color: "var(--wsg-green)", fontWeight: 500 }}>
            ✓ Saved
          </span>
        )}
        {dirty && !saving && (
          <span style={{ fontSize: "0.82rem", color: "var(--ink-muted)", fontWeight: 300 }}>
            Unsaved edits
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4" style={{ borderTop: "1px solid var(--line)", paddingTop: "2rem" }}>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="wsg-btn-camel disabled:opacity-40"
        >
          {loading ? "Pushing..." : "Approve & Push to Instantly →"}
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
