import type { CampaignStatus } from "@/types"

type PillSpec = { label: string; variant: string; pulse?: boolean }

const STATUS_PILL: Record<CampaignStatus, PillSpec> = {
  draft: { label: "Starting", variant: "pill--muted", pulse: true },
  querying: { label: "Finding Contacts", variant: "pill--blue", pulse: true },
  awaiting_sql_review: { label: "Review Audience", variant: "pill--camel" },
  awaiting_volume: { label: "Choose Volume", variant: "pill--camel" },
  enriching: { label: "Verifying Emails", variant: "pill--blue", pulse: true },
  awaiting_copy_review: { label: "Review Sequence", variant: "pill--camel" },
  pushing: { label: "Sending to Instantly", variant: "pill--blue", pulse: true },
  completed: { label: "Complete", variant: "pill--green" },
  failed: { label: "Failed", variant: "pill--red" },
  cancelled: { label: "Stopped", variant: "pill--muted" },
}

export function StatusPill({ status }: { status: CampaignStatus }) {
  const spec = STATUS_PILL[status]
  return (
    <span className={`pill ${spec.variant}`}>
      <span className={`pill__dot${spec.pulse ? " pill__dot--pulse" : ""}`} />
      {spec.label}
    </span>
  )
}

/* Email verification status → pill (used in the live lead table) */
const EMAIL_PILL: Record<string, PillSpec> = {
  valid: { label: "Valid", variant: "pill--green" },
  risky: { label: "Risky", variant: "pill--camel" },
  catch_all: { label: "Catch-all", variant: "pill--camel" },
  invalid: { label: "Invalid", variant: "pill--red" },
  unknown: { label: "Unknown", variant: "pill--muted" },
}

export function EmailStatusPill({ status }: { status: string | null }) {
  const spec = EMAIL_PILL[status ?? "unknown"] ?? EMAIL_PILL.unknown
  return <span className={`pill ${spec.variant}`}>{spec.label}</span>
}
