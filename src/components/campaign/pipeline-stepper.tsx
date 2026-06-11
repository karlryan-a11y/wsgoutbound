"use client"

import type { CampaignStatus } from "@/types"

const STAGES = [
  { key: "ask", label: "Ask" },
  { key: "query", label: "Query" },
  { key: "review", label: "Review" },
  { key: "enrich", label: "Verify" },
  { key: "copy", label: "Copy" },
  { key: "push", label: "Push" },
] as const

type Stage = (typeof STAGES)[number]["key"]

function statusToStageIndex(status: CampaignStatus): number {
  switch (status) {
    case "draft":
    case "querying":
      return 1
    case "awaiting_sql_review":
      return 2
    case "awaiting_volume":
    case "enriching":
      return 3
    case "awaiting_copy_review":
      return 4
    case "pushing":
      return 5
    case "completed":
      return 6
    case "failed":
    case "cancelled":
      return -1
  }
}

function failedStageIndex(status: CampaignStatus): number {
  if (status !== "failed" && status !== "cancelled") return -1
  return 3
}

export function PipelineStepper({ status }: { status: CampaignStatus }) {
  const activeIdx = statusToStageIndex(status)
  const failIdx = failedStageIndex(status)
  const isFailed = status === "failed"
  const isCancelled = status === "cancelled"
  const isTerminal = isFailed || isCancelled

  return (
    <div className="mb-12" style={{ paddingTop: "0.5rem" }}>
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isComplete = !isTerminal && activeIdx > i
          const isActive = !isTerminal && activeIdx === i
          const isFailedStage = isTerminal && failIdx === i
          const isFutureOfFailed = isTerminal && i > failIdx
          const isPastOfFailed = isTerminal && i < failIdx

          let dotColor = "rgba(0, 0, 0,0.15)"
          let labelColor = "rgba(0, 0, 0,0.2)"

          if (isComplete || isPastOfFailed) {
            dotColor = "#2D500D"
            labelColor = "rgba(0, 0, 0,0.45)"
          } else if (isActive) {
            dotColor = "#BE7B44"
            labelColor = "#BE7B44"
          } else if (isFailedStage && isFailed) {
            dotColor = "#C30319"
            labelColor = "#C30319"
          } else if (isFailedStage && isCancelled) {
            dotColor = "rgba(0, 0, 0,0.5)"
            labelColor = "rgba(0, 0, 0,0.5)"
          } else if (isFutureOfFailed) {
            dotColor = "rgba(0, 0, 0,0.08)"
            labelColor = "rgba(0, 0, 0,0.12)"
          }

          return (
            <div key={stage.key} className="flex items-center" style={{ flex: i < STAGES.length - 1 ? 1 : "none" }}>
              <div className="flex flex-col items-center" style={{ minWidth: "48px" }}>
                <div
                  style={{
                    width: isComplete || isPastOfFailed ? "10px" : isActive || isFailedStage ? "12px" : "8px",
                    height: isComplete || isPastOfFailed ? "10px" : isActive || isFailedStage ? "12px" : "8px",
                    background: dotColor,
                    transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {(isComplete || isPastOfFailed) && (
                    <svg viewBox="0 0 10 10" style={{ width: "100%", height: "100%" }}>
                      <path d="M2.5 5 L4.5 7 L7.5 3" stroke="#fff" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: "0.62rem",
                    fontWeight: isActive || isFailedStage ? 500 : 400,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: labelColor,
                    marginTop: "0.5rem",
                    transition: "color 0.5s ease",
                  }}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    marginBottom: "1.25rem",
                    background:
                      isComplete || isPastOfFailed
                        ? "#2D500D"
                        : isActive
                          ? `linear-gradient(to right, #BE7B44, rgba(0, 0, 0,0.08))`
                          : "rgba(0, 0, 0,0.08)",
                    transition: "background 0.5s ease",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
