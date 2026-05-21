"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { submitCopyReview } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

export function CopyReview({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const masterCopy = campaign.master_copy

  async function handleApprove() {
    setLoading(true)
    await submitCopyReview(campaign.id, "approve")
    router.refresh()
  }

  async function handleReject() {
    setLoading(true)
    await submitCopyReview(campaign.id, "reject")
    router.refresh()
  }

  if (!masterCopy?.steps) {
    return <p className="text-muted-foreground">Generating copy...</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Sequence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {masterCopy.steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline">Step {i + 1}</Badge>
                <span className="text-xs text-muted-foreground">
                  {step.delay_days === 0
                    ? "Send immediately"
                    : `+${step.delay_days} days`}
                </span>
              </div>
              <p className="mb-2 font-medium">{step.subject}</p>
              <pre className="whitespace-pre-wrap text-sm text-zinc-400">
                {step.body}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleApprove} disabled={loading}>
          Approve & Push to Instantly
        </Button>
        <Button variant="outline" onClick={handleReject} disabled={loading}>
          Reject & Cancel
        </Button>
      </div>
    </div>
  )
}
