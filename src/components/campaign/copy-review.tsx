"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
      <div className="flex items-center gap-3 py-12 text-white/50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#BE7B44]/30 border-t-[#BE7B44]" />
        Generating copy...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email cards — camel bg with dark email previews */}
      <div className="rounded-xl bg-[#BE7B44] p-6">
        <h2 className="mb-5 text-lg font-medium text-white">Email Sequence</h2>
        <div className="space-y-4">
          {masterCopy.steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg bg-black/20 p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Badge className="border-0 bg-white/20 text-white text-xs">
                  Step {i + 1}
                </Badge>
                <span className="text-xs text-white/50">
                  {step.delay_days === 0
                    ? "Send immediately"
                    : `+${step.delay_days} days`}
                </span>
              </div>
              <p className="mb-2 font-medium text-white">{step.subject}</p>
              <pre className="whitespace-pre-wrap text-sm text-white/70">
                {step.body}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleApprove}
          disabled={loading}
          className="bg-[#BE7B44] text-white hover:bg-[#A86A37]"
        >
          Approve & Push to Instantly
        </Button>
        <Button
          onClick={handleReject}
          disabled={loading}
          className="border border-white/10 bg-transparent text-white/60 hover:bg-white/5 hover:text-white"
        >
          Reject & Cancel
        </Button>
      </div>
    </div>
  )
}
