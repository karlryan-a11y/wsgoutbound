"use client"

import { useState } from "react"
import type { Campaign, CampaignStatus } from "@/types"
import {
  PipelineStepper,
  type StageKey,
} from "./pipeline-stepper"
import { SqlReview } from "./sql-review"
import { VolumePicker } from "./volume-picker"
import { CopyReview } from "./copy-review"
import { PushStatus } from "./push-status"
import { LiveProgress } from "./live-progress"
import { StageSummary } from "./stage-summary"

function currentStageKey(status: CampaignStatus): StageKey {
  switch (status) {
    case "draft":
    case "querying":
      return "query"
    case "awaiting_sql_review":
      return "review"
    case "awaiting_volume":
    case "enriching":
    case "failed":
    case "cancelled":
      return "enrich"
    case "awaiting_copy_review":
      return "copy"
    case "pushing":
    case "completed":
      return "push"
  }
}

export function CampaignWorkspace({ campaign }: { campaign: Campaign }) {
  const c = campaign
  const currentKey = currentStageKey(c.status)
  const [selected, setSelected] = useState<StageKey>(currentKey)

  const isViewingCurrent = selected === currentKey

  function renderCurrent() {
    switch (c.status) {
      case "awaiting_sql_review":
        return <SqlReview campaign={c} />
      case "awaiting_volume":
        return <VolumePicker campaign={c} />
      case "awaiting_copy_review":
        return <CopyReview campaign={c} />
      case "completed":
        return <PushStatus campaign={c} />
      default:
        // draft, querying, enriching, pushing, failed, cancelled
        return <LiveProgress campaignId={c.id} />
    }
  }

  return (
    <>
      <PipelineStepper
        status={c.status}
        selectedKey={selected}
        onSelect={setSelected}
      />

      {/* Hint when looking back at a past stage */}
      {!isViewingCurrent && (
        <button
          onClick={() => setSelected(currentKey)}
          className="mb-6 inline-block"
          style={{
            fontFamily: "var(--sans)",
            fontSize: "0.74rem",
            letterSpacing: "0.06em",
            color: "var(--wsg-camel)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Back to current step
        </button>
      )}

      <hr className="rule-camel mb-12" />

      {isViewingCurrent ? renderCurrent() : <StageSummary stageKey={selected} campaign={c} />}
    </>
  )
}
