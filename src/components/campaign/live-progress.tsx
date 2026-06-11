"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

type RecentLead = {
  id: string
  name: string
  title: string
  company: string
  email: string
  email_status: string | null
}

type ProgressData = {
  status: string
  candidate_count: number
  enriched_count: number
  valid_count: number
  personalized_count: number
  pushed_count: number
  total_leads: number
  updated_at: string
  failure_reason: string | null
  recent_leads: RecentLead[]
}

type Phase = {
  label: string
  detail: string
  percent: number
  eta: string | null
}

function getPhase(data: ProgressData): Phase {
  const {
    status,
    total_leads,
    enriched_count,
    candidate_count,
    personalized_count,
    pushed_count,
  } = data

  switch (status) {
    case "draft":
      return {
        label: "Starting",
        detail: "Building your search query...",
        percent: 0,
        eta: null,
      }

    case "querying":
      return {
        label: "Finding Contacts",
        detail: "Searching for matching contacts...",
        percent: 5,
        eta: "~10 seconds",
      }

    case "enriching": {
      const target = total_leads || 1
      const pct = Math.min(Math.round((enriched_count / target) * 100), 99)
      const remaining = target - enriched_count
      const etaSec = Math.ceil((remaining / 50) * 11)
      const etaStr =
        etaSec < 60
          ? `~${etaSec}s`
          : `~${Math.ceil(etaSec / 60)} min`
      return {
        label: "Verifying Emails",
        detail: `Checking email addresses — ${enriched_count} of ${target} contacts`,
        percent: pct,
        eta: remaining > 0 ? etaStr : null,
      }
    }

    case "awaiting_copy_review":
      return {
        label: "Sequence Ready",
        detail: "Review the email sequence below.",
        percent: 100,
        eta: null,
      }

    case "pushing": {
      if (
        total_leads > 0 &&
        personalized_count < total_leads &&
        pushed_count === 0
      ) {
        const pct = Math.min(
          Math.round((personalized_count / total_leads) * 100),
          99
        )
        const remaining = total_leads - personalized_count
        const etaSec = remaining * 3
        const etaStr =
          etaSec < 60
            ? `~${etaSec}s`
            : `~${Math.ceil(etaSec / 60)} min`
        return {
          label: "Personalizing",
          detail: `Writing openers — ${personalized_count} of ${total_leads} contacts`,
          percent: pct,
          eta: remaining > 0 ? etaStr : null,
        }
      }
      if (
        total_leads > 0 &&
        pushed_count > 0 &&
        pushed_count < total_leads
      ) {
        const pct = Math.min(
          Math.round((pushed_count / total_leads) * 100),
          99
        )
        return {
          label: "Sending to Instantly",
          detail: `Uploading contacts — ${pushed_count} of ${total_leads}`,
          percent: pct,
          eta: "~10 seconds",
        }
      }
      return {
        label: "Sending to Instantly",
        detail: "Preparing contacts for Instantly...",
        percent: 50,
        eta: null,
      }
    }

    case "completed":
      return {
        label: "Complete",
        detail: "Campaign is live in Instantly.",
        percent: 100,
        eta: null,
      }

    default:
      return {
        label: status,
        detail: "",
        percent: 0,
        eta: null,
      }
  }
}

const STATUS_COLORS: Record<string, string> = {
  valid: "#2D500D",
  risky: "#BE7B44",
  catch_all: "#BE7B44",
  invalid: "#C30319",
  unknown: "rgba(255,255,255,0.35)",
}

// ── Stall detection ───────────────────────────────────────────────────
// If enriched_count doesn't change for STALL_WARN_SEC, show a warning.
// If it doesn't change for STALL_FAIL_SEC, show an error.
const STALL_WARN_SEC = 90
const STALL_FAIL_SEC = 180

type StallState = "ok" | "warning" | "stalled"

export function LiveProgress({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [data, setData] = useState<ProgressData | null>(null)
  const [prevStatus, setPrevStatus] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [stallState, setStallState] = useState<StallState>("ok")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track when enriched_count last changed
  const lastProgressRef = useRef<{ count: number; at: number }>({
    count: 0,
    at: Date.now(),
  })

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/campaign/${campaignId}/progress`, {
          cache: "no-store",
        })
        if (res.ok) {
          const d = await res.json()
          setData(d)

          // ── Stall detection (only during enriching/pushing) ──
          if (d.status === "enriching" || d.status === "pushing") {
            const currentCount = d.enriched_count + d.personalized_count + d.pushed_count
            if (currentCount !== lastProgressRef.current.count) {
              // Progress moved — reset
              lastProgressRef.current = { count: currentCount, at: Date.now() }
              setStallState("ok")
            } else {
              // No progress — check how long
              const elapsedSec = (Date.now() - lastProgressRef.current.at) / 1000
              if (elapsedSec >= STALL_FAIL_SEC) {
                setStallState("stalled")
              } else if (elapsedSec >= STALL_WARN_SEC) {
                setStallState("warning")
              }
            }
          } else {
            // Reset stall tracking when not in a processing phase
            setStallState("ok")
          }

          if (
            prevStatus &&
            d.status !== prevStatus &&
            (d.status === "awaiting_sql_review" ||
              d.status === "awaiting_volume" ||
              d.status === "awaiting_copy_review" ||
              d.status === "completed" ||
              d.status === "failed" ||
              d.status === "cancelled")
          ) {
            router.refresh()
          }
          setPrevStatus(d.status)
        }
      } catch {
        // silently retry
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [campaignId, prevStatus, router])

  async function handleCancel() {
    if (cancelling) return
    setCancelling(true)
    try {
      await fetch(`/api/campaign/${campaignId}/cancel`, { method: "POST" })
      router.refresh()
    } catch {
      setCancelling(false)
    }
  }

  if (!data) {
    return (
      <div className="flex items-center gap-4 py-16">
        <div className="wsg-spinner" />
        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 300 }}>
          Loading...
        </span>
      </div>
    )
  }

  const phase = getPhase(data)
  const showStopButton =
    data.status === "enriching" || data.status === "pushing"
  const showLeadTable =
    (data.status === "enriching" ||
      data.status === "failed" ||
      data.status === "cancelled") &&
    data.recent_leads?.length > 0
  const isFailed = data.status === "failed"
  const isCancelled = data.status === "cancelled"

  return (
    <div>
      {/* Phase label + stop button */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className="eyebrow block"
          style={
            isFailed
              ? { color: "#C30319" }
              : isCancelled
                ? { color: "rgba(255,255,255,0.5)" }
                : undefined
          }
        >
          {isFailed ? "Failed" : isCancelled ? "Stopped" : phase.label}
        </span>
        {showStopButton && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="wsg-btn-ghost disabled:opacity-40"
            style={{
              fontSize: "0.72rem",
              padding: "0.5rem 1.25rem",
              borderColor: "#C30319",
              color: "#C30319",
            }}
          >
            {cancelling ? "Stopping..." : "Stop"}
          </button>
        )}
      </div>

      {/* Detail + ETA */}
      <p
        className="mb-4"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
          fontWeight: 300,
          lineHeight: 1.3,
        }}
      >
        {isFailed
          ? "Email verification stopped due to an error."
          : isCancelled
            ? "Email verification was stopped."
            : phase.detail}
      </p>

      {/* Failure reason banner */}
      {isFailed && data.failure_reason && (
        <div
          className="mb-8"
          style={{
            border: "1px solid #C30319",
            padding: "1.25rem 1.5rem",
            background: "rgba(195, 3, 25, 0.08)",
          }}
        >
          <p
            className="eyebrow mb-2"
            style={{ fontSize: "0.62rem", color: "#C30319" }}
          >
            Error Details
          </p>
          <p
            style={{
              fontSize: "0.95rem",
              fontWeight: 400,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
            }}
          >
            {data.failure_reason}
          </p>
        </div>
      )}

      {/* Cancelled summary */}
      {isCancelled && (data.enriched_count > 0 || data.valid_count > 0) && (
        <p
          className="mb-8"
          style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 300,
          }}
        >
          Stopped after checking {data.enriched_count.toLocaleString()} contacts
          ({data.valid_count.toLocaleString()} verified).
        </p>
      )}

      {/* Stall warning banner */}
      {stallState === "warning" && !isFailed && !isCancelled && (
        <div
          className="mb-8"
          style={{
            border: "1px solid var(--wsg-camel)",
            padding: "1.25rem 1.5rem",
            background: "rgba(190, 123, 68, 0.08)",
          }}
        >
          <p
            className="eyebrow mb-2"
            style={{ fontSize: "0.62rem", color: "var(--wsg-camel)" }}
          >
            Slow Progress
          </p>
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 300,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
            }}
          >
            No new emails verified in the last 90 seconds. This may indicate
            an issue with the verification service. If it persists, try stopping and
            re-running.
          </p>
        </div>
      )}

      {stallState === "stalled" && !isFailed && !isCancelled && (
        <div
          className="mb-8"
          style={{
            border: "1px solid #C30319",
            padding: "1.25rem 1.5rem",
            background: "rgba(195, 3, 25, 0.08)",
          }}
        >
          <p
            className="eyebrow mb-2"
            style={{ fontSize: "0.62rem", color: "#C30319" }}
          >
            Verification Stopped Responding
          </p>
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 300,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
            }}
          >
            No progress for over 3 minutes. Possible causes: LeadMagic credits
            exhausted, rate limiting, or network issues. Consider stopping
            and checking your LeadMagic balance.
          </p>
        </div>
      )}

      {/* Candidate pool info during enriching */}
      {data.status === "enriching" && data.candidate_count > 0 && (
        <p
          className="mb-10"
          style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 300,
          }}
        >
          From {data.candidate_count.toLocaleString()} matching contacts
        </p>
      )}

      {/* Progress bar */}
      <div
        style={{ borderTop: "1px solid var(--line)", paddingTop: "2.5rem" }}
      >
        {/* Bar */}
        <div
          style={{
            height: "2px",
            background: "var(--line)",
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "2px",
              background: "var(--wsg-camel)",
              width: `${phase.percent}%`,
              transition: "width 1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </div>

        {/* Stats row */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isFailed && !isCancelled && phase.percent < 100 && (
              <div className="wsg-spinner" />
            )}
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 300,
                color: isFailed
                  ? "#C30319"
                  : isCancelled
                    ? "rgba(255,255,255,0.5)"
                    : "var(--wsg-camel)",
              }}
            >
              {isFailed
                ? "Error"
                : isCancelled
                  ? "Stopped"
                  : `${phase.percent}%`}
            </span>
          </div>
          {phase.eta && !isFailed && !isCancelled && (
            <span
              style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.6)",
                fontWeight: 400,
              }}
            >
              {phase.eta} remaining
            </span>
          )}
        </div>

        {/* Count stats */}
        {(data.enriched_count > 0 || data.valid_count > 0) && (
          <div
            className="mt-8 grid grid-cols-3 gap-0"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <div
              style={{
                padding: "1.5rem 1.5rem 1.5rem 0",
                borderRight: "1px solid var(--line)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "1.5rem",
                  fontWeight: 300,
                  marginBottom: "0.25rem",
                }}
              >
                {data.enriched_count.toLocaleString()}
              </p>
              <span
                className="eyebrow"
                style={{
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Checked
              </span>
            </div>
            <div
              style={{
                padding: "1.5rem",
                borderRight: "1px solid var(--line)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "1.5rem",
                  fontWeight: 300,
                  marginBottom: "0.25rem",
                  color: "var(--wsg-camel)",
                }}
              >
                {data.valid_count.toLocaleString()}
              </p>
              <span
                className="eyebrow"
                style={{
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Verified
              </span>
            </div>
            <div
              style={{
                padding: "1.5rem 0 1.5rem 1.5rem",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "1.5rem",
                  fontWeight: 300,
                  marginBottom: "0.25rem",
                }}
              >
                {data.personalized_count.toLocaleString()}
              </p>
              <span
                className="eyebrow"
                style={{
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Personalized
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live lead table — show during enriching, failed, or cancelled */}
      {showLeadTable && (
        <div className="mt-12">
          <div
            className="mb-6 flex items-center justify-between"
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: "2rem",
            }}
          >
            <span className="eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
              Verified Contacts
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.35)",
                fontWeight: 300,
              }}
            >
              Showing latest {data.recent_leads.length}
            </span>
          </div>

          <div
            className="overflow-x-auto"
            style={{ border: "1px solid var(--line)" }}
          >
            <table className="w-full" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Name", "Title", "Company", "Email", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="eyebrow text-left"
                        style={{
                          padding: "0.9rem 1.25rem",
                          fontSize: "0.62rem",
                          background: "var(--surface-raised)",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {data.recent_leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition-colors duration-200"
                    style={{
                      borderBottom: "1px solid var(--line)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "0.75rem 1.25rem",
                        color: "rgba(255,255,255,0.8)",
                        fontWeight: 400,
                      }}
                    >
                      {String(lead.name)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1.25rem",
                        color: "rgba(255,255,255,0.55)",
                        fontWeight: 300,
                      }}
                    >
                      {String(lead.title)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1.25rem",
                        color: "rgba(255,255,255,0.55)",
                        fontWeight: 300,
                      }}
                    >
                      {String(lead.company)}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1.25rem",
                        color: "rgba(255,255,255,0.7)",
                        fontWeight: 300,
                        fontFamily: "var(--sans)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {lead.email}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1.25rem",
                        fontWeight: 500,
                        fontSize: "0.72rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color:
                          STATUS_COLORS[lead.email_status ?? "unknown"] ??
                          "rgba(255,255,255,0.35)",
                      }}
                    >
                      {lead.email_status ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
