"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
    <div className="rounded-xl bg-[#BE7B44] p-6">
      <h2 className="mb-5 text-lg font-medium text-white">
        Select Volume to Enrich
      </h2>

      <div className="space-y-6">
        <p className="text-sm text-white/70">
          Total candidates from query:{" "}
          <span className="font-semibold text-white">
            {maxCandidates.toLocaleString()}
          </span>
        </p>

        <div>
          <p className="mb-3 text-sm text-white/80">
            Enrich{" "}
            <span className="text-2xl font-bold text-white">{enrichCount}</span>{" "}
            leads
          </p>
          <Slider
            value={[enrichCount]}
            onValueChange={(v) => setEnrichCount(Array.isArray(v) ? v[0] : v)}
            min={10}
            max={Math.min(maxCandidates, 1000)}
            step={10}
          />
          <div className="mt-2 flex justify-between text-xs text-white/40">
            <span>10</span>
            <span>{Math.min(maxCandidates, 1000)}</span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-white text-black hover:bg-white/90"
        >
          {loading
            ? "Starting enrichment..."
            : `Enrich ${enrichCount} leads`}
        </Button>
      </div>
    </div>
  )
}
