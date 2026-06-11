"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitSqlReview } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

/* ── data table ────────────────────────────────────────────────────── */
function SampleTable({
  rows,
  maxRows = 10,
}: {
  rows: Record<string, unknown>[]
  maxRows?: number
}) {
  if (!rows || rows.length === 0) return null

  const allKeys = Object.keys(rows[0])
  const priorityKeys = allKeys.filter((k) => {
    const l = k.toLowerCase()
    return (
      l.includes("name") ||
      l.includes("title") ||
      l.includes("company") ||
      l.includes("location") ||
      l.includes("city") ||
      l.includes("state") ||
      l.includes("region") ||
      l.includes("industry") ||
      l.includes("email") ||
      l.includes("size") ||
      l.includes("seniority")
    )
  })
  const displayKeys =
    priorityKeys.length >= 3 ? priorityKeys.slice(0, 6) : allKeys.slice(0, 6)

  function fmt(key: string) {
    return key
      .replace(/^(person_|sanitized_|primary_)/, "")
      .replace(/_unanalyzed$/, "")
      .replace(/_normalized.*$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="overflow-x-auto" style={{ border: "1px solid var(--line)" }}>
      <table className="w-full" style={{ fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {displayKeys.map((k) => (
              <th
                key={k}
                className="eyebrow text-left"
                style={{
                  padding: "0.9rem 1.25rem",
                  fontSize: "0.62rem",
                  background: "var(--surface-raised)",
                }}
              >
                {fmt(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, i) => (
            <tr
              key={i}
              className="transition-colors duration-200"
              style={{
                borderBottom: "1px solid var(--line)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {displayKeys.map((k) => (
                <td
                  key={k}
                  style={{
                    padding: "0.75rem 1.25rem",
                    color: "rgba(0, 0, 0,0.6)",
                    fontWeight: 300,
                  }}
                >
                  {String(row[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── main component ────────────────────────────────────────────────── */
export function SqlReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"included" | "excluded">(
    "included"
  )

  const v = campaign.sql_versions?.[campaign.sql_versions.length - 1]

  async function handleApprove() {
    setLoading(true)
    await submitSqlReview(campaign.id, "approve")

    // Poll until status changes from awaiting_sql_review, then refresh
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaign/${campaign.id}/progress`, {
          cache: "no-store",
        })
        if (res.ok) {
          const d = await res.json()
          if (d.status !== "awaiting_sql_review") {
            clearInterval(poll)
            router.refresh()
          }
        }
      } catch {
        // keep polling
      }
    }, 2000)
  }

  async function handleRefine() {
    if (!feedback.trim()) return
    setLoading(true)
    await submitSqlReview(campaign.id, "refine", feedback)
    setFeedback("")
    setLoading(false)
    router.refresh()
  }

  if (!v) {
    return (
      <div className="flex items-center gap-4 py-16">
        <div className="wsg-spinner" />
        <span style={{ color: "rgba(0, 0, 0,0.45)", fontWeight: 300 }}>
          Generating query criteria...
        </span>
      </div>
    )
  }

  const criteria = v.criteria
  const hasCriteria =
    criteria &&
    (criteria.included.length > 0 || criteria.excluded.length > 0)
  const hasExcluded = v.excluded_sample && v.excluded_sample.length > 0

  return (
    <div>
      {/* ── Criteria section ──────────────────────────────────────── */}
      <div className="mb-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="eyebrow mb-3 block">Query Criteria</span>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
                fontWeight: 300,
              }}
            >
              Audience Definition
              {campaign.sql_versions.length > 1 && (
                <span
                  className="ml-3"
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "0.85rem",
                    fontStyle: "italic",
                    color: "var(--wsg-muted)",
                  }}
                >
                  v{campaign.sql_versions.length}
                </span>
              )}
            </h2>
          </div>
          <span
            style={{
              fontFamily: "var(--sans)",
              fontSize: "1.5rem",
              fontWeight: 300,
              color: "var(--wsg-camel)",
            }}
          >
            {v.row_count?.toLocaleString() ?? "—"}
            <span
              className="eyebrow ml-2"
              style={{ fontSize: "0.62rem", color: "rgba(0, 0, 0,0.4)" }}
            >
              matches
            </span>
          </span>
        </div>

        {hasCriteria ? (
          <div
            className="grid gap-0 md:grid-cols-2"
            style={{ border: "1px solid var(--line)" }}
          >
            {/* Including */}
            <div
              style={{
                padding: "2rem",
                borderRight: "1px solid var(--line)",
                borderTop: "2px solid rgba(0, 0, 0,0.6)",
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: "rgba(0, 0, 0,0.5)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="eyebrow" style={{ color: "rgba(0, 0, 0,0.5)" }}>
                  Including
                </span>
              </div>
              <ul className="space-y-2.5">
                {criteria.included.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3"
                    style={{
                      fontSize: "0.92rem",
                      color: "rgba(0, 0, 0,0.72)",
                      fontWeight: 300,
                    }}
                  >
                    <span
                      className="mt-2.5 h-px w-3 shrink-0"
                      style={{ background: "rgba(0, 0, 0,0.2)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Excluding */}
            <div
              style={{
                padding: "2rem",
                borderTop: "2px solid rgba(0, 0, 0,0.2)",
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: "rgba(0, 0, 0,0.46)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="eyebrow" style={{ color: "rgba(0, 0, 0,0.5)" }}>
                  Excluding
                </span>
              </div>
              <ul className="space-y-2.5">
                {criteria.excluded.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3"
                    style={{
                      fontSize: "0.92rem",
                      color: "rgba(0, 0, 0,0.5)",
                      fontWeight: 300,
                    }}
                  >
                    <span
                      className="mt-2.5 h-px w-3 shrink-0"
                      style={{ background: "rgba(0, 0, 0,0.12)" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "1rem", color: "rgba(0, 0, 0,0.6)", fontWeight: 300, maxWidth: "48ch" }}>
            {v.reasoning}
          </p>
        )}
      </div>

      {/* ── Sample results ────────────────────────────────────────── */}
      {(v.sample?.length ?? 0) > 0 && (
        <div className="mb-12">
          {/* Tab switcher */}
          <div
            className="mb-6 flex gap-0"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <button
              onClick={() => setActiveTab("included")}
              className="transition-colors duration-300"
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.74rem",
                fontWeight: activeTab === "included" ? 500 : 400,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color:
                  activeTab === "included"
                    ? "var(--ink)"
                    : "rgba(0, 0, 0,0.5)",
                padding: "1rem 1.5rem",
                borderBottom:
                  activeTab === "included"
                    ? "2px solid var(--wsg-camel)"
                    : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Included
              <span className="ml-1.5" style={{ opacity: 0.5 }}>
                ({v.row_count?.toLocaleString() ?? 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("excluded")}
              className="transition-colors duration-300"
              style={{
                fontFamily: "var(--sans)",
                fontSize: "0.74rem",
                fontWeight: activeTab === "excluded" ? 500 : 400,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color:
                  activeTab === "excluded"
                    ? "var(--ink)"
                    : "rgba(0, 0, 0,0.5)",
                padding: "1rem 1.5rem",
                borderBottom:
                  activeTab === "excluded"
                    ? "2px solid rgba(0, 0, 0,0.5)"
                    : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Excluded
              {v.excluded_count != null && (
                <span className="ml-1.5" style={{ opacity: 0.5 }}>
                  ({v.excluded_count.toLocaleString()})
                </span>
              )}
            </button>
          </div>

          {activeTab === "included" ? (
            <SampleTable rows={v.sample ?? []} />
          ) : hasExcluded ? (
            <SampleTable rows={v.excluded_sample ?? []} />
          ) : (
            <div
              className="flex items-center justify-center py-12"
              style={{ border: "1px solid var(--line)" }}
            >
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(0, 0, 0,0.42)",
                  fontWeight: 300,
                }}
              >
                No excluded sample available for this version
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Refinement + actions ──────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "2.5rem" }}>
        <span className="eyebrow mb-4 block" style={{ color: "rgba(0, 0, 0,0.4)" }}>
          Refinement
        </span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g. Include VP of Operations titles, exclude healthcare industry, focus on companies with 200+ employees..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.85rem 0",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--line-strong)",
            color: "var(--ink)",
            fontFamily: "var(--sans)",
            fontSize: "1rem",
            fontWeight: 300,
            lineHeight: 1.7,
            outline: "none",
            resize: "vertical",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) =>
            (e.target.style.borderBottomColor = "var(--wsg-camel)")
          }
          onBlur={(e) =>
            (e.target.style.borderBottomColor = "var(--line-strong)")
          }
        />
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="wsg-btn-primary disabled:opacity-40"
          >
            {loading ? "Processing..." : "Approve & Continue"}
          </button>
          <button
            onClick={handleRefine}
            disabled={loading || !feedback.trim()}
            className="wsg-btn-muted disabled:opacity-30"
          >
            Refine Query
          </button>
        </div>
      </div>
    </div>
  )
}
