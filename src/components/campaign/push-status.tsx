import type { Campaign } from "@/types"

export function PushStatus({ campaign }: { campaign: Campaign }) {
  const isCompleted = campaign.status === "completed"

  return (
    <div>
      <span className="eyebrow mb-4 block">
        {isCompleted ? "Complete" : "In Progress"}
      </span>
      <h2
        className="mb-12"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
          fontWeight: 300,
        }}
      >
        {isCompleted ? "Campaign Complete" : "Pushing to Instantly"}
      </h2>

      {/* Stats grid — numbered like services */}
      <div
        className="grid grid-cols-3"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <div
          style={{
            padding: "2.5rem 2rem 2.5rem 0",
            borderBottom: "1px solid var(--line)",
            borderRight: "1px solid var(--line)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "var(--wsg-muted)",
              display: "block",
              marginBottom: "0.75rem",
            }}
          >
            01
          </span>
          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              marginBottom: "0.5rem",
            }}
          >
            {campaign.candidate_count?.toLocaleString() ?? "—"}
          </p>
          <span className="eyebrow" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
            Candidates
          </span>
        </div>

        <div
          style={{
            padding: "2.5rem 2rem",
            borderBottom: "1px solid var(--line)",
            borderRight: "1px solid var(--line)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "var(--wsg-muted)",
              display: "block",
              marginBottom: "0.75rem",
            }}
          >
            02
          </span>
          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              marginBottom: "0.5rem",
            }}
          >
            {campaign.enriched_count?.toLocaleString() ?? "—"}
          </p>
          <span className="eyebrow" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
            Enriched
          </span>
        </div>

        <div
          style={{
            padding: "2.5rem 0 2.5rem 2rem",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: "0.85rem",
              fontStyle: "italic",
              color: "var(--wsg-muted)",
              display: "block",
              marginBottom: "0.75rem",
            }}
          >
            03
          </span>
          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              marginBottom: "0.5rem",
              color: isCompleted ? "var(--wsg-camel)" : "#fff",
            }}
          >
            {campaign.valid_count?.toLocaleString() ?? "—"}
          </p>
          <span className="eyebrow" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
            Valid Emails
          </span>
        </div>
      </div>

      {isCompleted && campaign.instantly_campaign_id && (
        <div
          className="mt-12"
          style={{
            borderTop: "2px solid var(--wsg-camel)",
            border: "1px solid var(--line)",
            borderTopWidth: "2px",
            borderTopColor: "var(--wsg-camel)",
            padding: "2.5rem",
          }}
        >
          <span className="eyebrow mb-3 block" style={{ color: "rgba(255,255,255,0.4)" }}>
            Instantly Campaign
          </span>
          <p
            className="mb-1"
            style={{
              fontFamily: "var(--sans)",
              fontSize: "0.85rem",
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.02em",
            }}
          >
            {campaign.instantly_campaign_id}
          </p>
          <p
            className="mt-4"
            style={{
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.35)",
              fontWeight: 300,
            }}
          >
            Go to Instantly to configure sending and launch.
          </p>
        </div>
      )}
    </div>
  )
}
