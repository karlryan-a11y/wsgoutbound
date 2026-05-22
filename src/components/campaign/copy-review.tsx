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
    return (
      <div className="flex items-center gap-3 py-10 text-white/60">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#BE7B44]/30 border-t-[#BE7B44]" />
        Generating copy...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Email Sequence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {masterCopy.steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-[#BE7B44]/30 text-[#BE7B44]"
                >
                  Step {i + 1}
                </Badge>
                <span className="text-xs text-white/40">
                  {step.delay_days === 0
                    ? "Send immediately"
                    : `+${step.delay_days} days`}
                </span>
              </div>
              <p className="mb-2 font-medium text-white">{step.subject}</p>
              <pre className="whitespace-pre-wrap text-sm text-white/60">
                {step.body}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleApprove}
          disabled={loading}
          className="bg-[#2D500D] text-white hover:bg-[#3A6A12]"
        >
          Approve & Push to Instantly
        </Button>
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={loading}
          className="border-[#C30319]/30 text-[#C30319] hover:bg-[#C30319]/10"
        >
          Reject & Cancel
        </Button>
      </div>
    </div>
  )
}
