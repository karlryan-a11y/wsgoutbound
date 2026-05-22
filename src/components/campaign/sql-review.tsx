"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { submitSqlReview } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

/* ── data table (always on black) ───────────────────────────────────── */
function SampleTable({ rows, maxRows = 10 }: { rows: Record<string, unknown>[]; maxRows?: number }) {
  if (!rows || rows.length === 0) return null

  const allKeys = Object.keys(rows[0])
  const priorityKeys = allKeys.filter((k) => {
    const l = k.toLowerCase()
    return (
      l.includes("name") || l.includes("title") || l.includes("company") ||
      l.includes("location") || l.includes("city") || l.includes("state") ||
      l.includes("region") || l.includes("industry") || l.includes("email") ||
      l.includes("size") || l.includes("seniority")
    )
  })
  const displayKeys = priorityKeys.length >= 3 ? priorityKeys.slice(0, 6) : allKeys.slice(0, 6)

  function fmt(key: string) {
    return key
      .replace(/^(person_|sanitized_|primary_)/, "")
      .replace(/_unanalyzed$/, "")
      .replace(/_normalized.*$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.03]">
            {displayKeys.map((k) => (
              <th key={k} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                {fmt(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
              {displayKeys.map((k) => (
                <td key={k} className="px-4 py-2.5 text-white/60">
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

/* ── main component ─────────────────────────────────────────────────── */
export function SqlReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"included" | "excluded">("included")

  const v = campaign.sql_versions?.[campaign.sql_versions.length - 1]

  async function handleApprove() {
    setLoading(true)
    await submitSqlReview(campaign.id, "approve")
    router.refresh()
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
      <div className="flex items-center gap-3 py-12 text-white/50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#BE7B44]/30 border-t-[#BE7B44]" />
        Generating query criteria...
      </div>
    )
  }

  const criteria = v.criteria
  const hasCriteria = criteria && (criteria.included.length > 0 || criteria.excluded.length > 0)
  const hasExcluded = v.excluded_sample && v.excluded_sample.length > 0

  return (
    <div className="space-y-6">

      {/* ── criteria card (camel) ──────────────────────────────────── */}
      <div className="rounded-xl bg-[#BE7B44] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">
            Query Criteria
            {campaign.sql_versions.length > 1 && (
              <span className="ml-2 text-sm font-normal text-white/50">
                v{campaign.sql_versions.length}
              </span>
            )}
          </h2>
          <Badge className="border-0 bg-white/20 text-white">
            {v.row_count?.toLocaleString() ?? "—"} matches
          </Badge>
        </div>

        {hasCriteria ? (
          <div className="grid gap-4 md:grid-cols-2">
            {/* included */}
            <div className="rounded-lg bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-sm font-semibold text-white">Including</h3>
              </div>
              <ul className="space-y-1.5">
                {criteria.included.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/80">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* excluded */}
            <div className="rounded-lg bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <h3 className="text-sm font-semibold text-white/70">Excluding</h3>
              </div>
              <ul className="space-y-1.5">
                {criteria.excluded.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/70">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-white/30" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/70">{v.reasoning}</p>
        )}
      </div>

      {/* ── sample results (black bg, tabs) ───────────────────────── */}
      {(v.sample?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-black p-5">
          {/* tabs */}
          <div className="mb-4 flex gap-1 rounded-lg bg-white/[0.05] p-1">
            <button
              onClick={() => setActiveTab("included")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "included"
                  ? "bg-[#BE7B44] text-white shadow"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Included
              <span className="ml-1.5 text-xs opacity-60">
                ({v.row_count?.toLocaleString() ?? 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("excluded")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "excluded"
                  ? "bg-white/10 text-white shadow"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Excluded
              {v.excluded_count != null && (
                <span className="ml-1.5 text-xs opacity-60">
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
            <div className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center">
              <p className="text-sm text-white/30">
                No excluded sample available for this version
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── refinement actions (camel) ────────────────────────────── */}
      <div className="rounded-xl bg-[#BE7B44] p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Refinement feedback
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Include VP of Operations titles, exclude healthcare industry, focus on companies with 200+ employees..."
              className="min-h-[80px] border-white/20 bg-black/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="bg-white text-black hover:bg-white/90"
            >
              {loading ? "Processing..." : "Approve & Continue"}
            </Button>
            <Button
              onClick={handleRefine}
              disabled={loading || !feedback.trim()}
              className="border border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Refine Query
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
