"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { submitSqlReview } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

export function SqlReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(false)

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
    return <p className="text-muted-foreground">Generating SQL...</p>
  }

  return (
    <div className="space-y-6">
      {/* SQL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Generated SQL (v{campaign.sql_versions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-zinc-300">
            {latestVersion.sql}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            {latestVersion.reasoning}
          </p>
        </CardContent>
      </Card>

      {/* Sample Results */}
      {latestVersion.sample && latestVersion.sample.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sample Results ({latestVersion.row_count} rows)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {Object.keys(latestVersion.sample[0]).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left font-medium text-muted-foreground"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestVersion.sample.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-900">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-zinc-400">
                          {String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Feedback (optional for refine)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Add VP of Operations titles, exclude healthcare industry, focus on companies with 200+ employees"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleApprove} disabled={loading}>
                Approve SQL
              </Button>
              <Button
                variant="outline"
                onClick={handleRefine}
                disabled={loading || !feedback.trim()}
              >
                Refine
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
