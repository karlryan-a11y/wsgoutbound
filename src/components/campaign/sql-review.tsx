"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { submitSqlReview } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

function SampleTable({
  rows,
  maxRows = 10,
}: {
  rows: Record<string, unknown>[]
  maxRows?: number
}) {
  if (!rows || rows.length === 0) return null

  // Pick the most useful columns to display (skip internal IDs, long URLs)
  const allKeys = Object.keys(rows[0])
  const priorityKeys = allKeys.filter((k) => {
    const lower = k.toLowerCase()
    return (
      lower.includes("name") ||
      lower.includes("title") ||
      lower.includes("company") ||
      lower.includes("location") ||
      lower.includes("city") ||
      lower.includes("state") ||
      lower.includes("region") ||
      lower.includes("industry") ||
      lower.includes("email") ||
      lower.includes("size") ||
      lower.includes("seniority")
    )
  })
  const displayKeys =
    priorityKeys.length >= 3 ? priorityKeys.slice(0, 6) : allKeys.slice(0, 6)

  // Prettify column headers
  function formatHeader(key: string): string {
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
          <tr className="border-b border-white/[0.08] bg-white/[0.02]">
            {displayKeys.map((key) => (
              <th
                key={key}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/50"
              >
                {formatHeader(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, maxRows).map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
            >
              {displayKeys.map((key) => (
                <td key={key} className="px-4 py-2.5 text-white/70">
                  {String(row[key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SqlReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"included" | "excluded">(
    "included"
  )

  const latestVersion =
    campaign.sql_versions?.[campaign.sql_versions.length - 1]

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

  if (!latestVersion) {
    return (
      <div className="flex items-center gap-3 py-10 text-white/60">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#BE7B44]/30 border-t-[#BE7B44]" />
        Generating query criteria...
      </div>
    )
  }

  const criteria = latestVersion.criteria
  const hasCriteria = criteria && (criteria.included.length > 0 || criteria.excluded.length > 0)
  const hasExcludedSample =
    latestVersion.excluded_sample && latestVersion.excluded_sample.length > 0

  return (
    <div className="space-y-6">
      {/* Query Criteria */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">
              Query Criteria
              {campaign.sql_versions.length > 1 && (
                <span className="ml-2 text-sm font-normal text-white/40">
                  v{campaign.sql_versions.length}
                </span>
              )}
            </CardTitle>
            <Badge
              variant="outline"
              className="border-[#BE7B44]/30 text-[#BE7B44]"
            >
              {latestVersion.row_count?.toLocaleString() ?? "—"} matches
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {hasCriteria ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Included */}
              <div className="rounded-lg border border-[#2D500D]/30 bg-[#2D500D]/[0.06] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2D500D]/30">
                    <svg className="h-3.5 w-3.5 text-[#5A9A2F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-[#5A9A2F]">
                    Including
                  </h3>
                </div>
                <ul className="space-y-2">
                  {criteria.included.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-white/80"
                    >
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#5A9A2F]/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Excluded */}
              <div className="rounded-lg border border-[#C30319]/20 bg-[#C30319]/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C30319]/20">
                    <svg className="h-3.5 w-3.5 text-[#C30319]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-[#C30319]/80">
                    Excluding
                  </h3>
                </div>
                <ul className="space-y-2">
                  {criteria.excluded.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-white/80"
                    >
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#C30319]/40" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/60">
              {latestVersion.reasoning}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sample Results Tabs */}
      {(latestVersion.sample?.length ?? 0) > 0 && (
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-1">
              <button
                onClick={() => setActiveTab("included")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "included"
                    ? "bg-[#2D500D]/30 text-[#5A9A2F] shadow-sm"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Included Sample
                <span className="ml-1.5 text-xs opacity-60">
                  ({latestVersion.row_count?.toLocaleString() ?? 0} total)
                </span>
              </button>
              <button
                onClick={() => setActiveTab("excluded")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "excluded"
                    ? "bg-[#C30319]/20 text-[#C30319] shadow-sm"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Excluded Sample
                {latestVersion.excluded_count != null && (
                  <span className="ml-1.5 text-xs opacity-60">
                    ({latestVersion.excluded_count.toLocaleString()} total)
                  </span>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "included" ? (
              <SampleTable rows={latestVersion.sample ?? []} />
            ) : hasExcludedSample ? (
              <SampleTable rows={latestVersion.excluded_sample ?? []} />
            ) : (
              <div className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center">
                <p className="text-sm text-white/40">
                  No excluded sample available for this query version
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Refinement Actions */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">
                Refinement feedback
              </Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Include VP of Operations titles, exclude healthcare industry, focus on companies with 200+ employees..."
                className="mt-2 min-h-[80px] border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="bg-[#2D500D] text-white hover:bg-[#3A6A12]"
              >
                {loading ? "Processing..." : "Approve & Continue"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRefine}
                disabled={loading || !feedback.trim()}
                className="border-[#BE7B44]/30 text-[#BE7B44] hover:bg-[#BE7B44]/10"
              >
                Refine Query
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
