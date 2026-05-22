"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { submitVolumeSelection } from "@/app/c/[id]/actions"
import type { Campaign } from "@/types"

export function VolumePicker({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const maxCandidates = campaign.candidate_count ?? 1000
  const [enrichCount, setEnrichCount] = useState(
    Math.min(200, maxCandidates)
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    await submitVolumeSelection(campaign.id, enrichCount)
    router.refresh()
  }

  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-lg text-white">Select Volume to Enrich</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-white/50">
            Total candidates from query:{" "}
            <span className="font-medium text-white">
              {maxCandidates.toLocaleString()}
            </span>
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm text-white/70">
            Enrich{" "}
            <span className="text-xl font-bold text-[#BE7B44]">{enrichCount}</span>{" "}
            leads
          </p>
          <Slider
            value={[enrichCount]}
            onValueChange={(v) => setEnrichCount(Array.isArray(v) ? v[0] : v)}
            min={10}
            max={Math.min(maxCandidates, 1000)}
            step={10}
          />
          <div className="mt-2 flex justify-between text-xs text-white/30">
            <span>10</span>
            <span>{Math.min(maxCandidates, 1000)}</span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#BE7B44] text-white hover:bg-[#A86A37]"
        >
          {loading
            ? "Starting enrichment..."
            : `Enrich ${enrichCount} leads`}
        </Button>
      </CardContent>
    </Card>
  )
}
