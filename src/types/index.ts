// =============================================================================
// WSG Outbound — Shared Types
// =============================================================================

export type CampaignStatus =
  | "draft"
  | "awaiting_sql_review"
  | "querying"
  | "awaiting_volume"
  | "enriching"
  | "awaiting_copy_review"
  | "pushing"
  | "completed"
  | "failed"
  | "cancelled"

export type Campaign = {
  id: string
  name: string
  status: CampaignStatus
  brief: CampaignBrief
  sql_versions: SqlVersion[]
  candidate_count: number | null
  enriched_count: number | null
  valid_count: number | null
  master_copy: MasterCopy | null
  instantly_campaign_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type CampaignBrief = {
  // Core
  persona: string
  titles_include: string[]
  titles_exclude?: string[]
  geographies: string[]
  industries?: string[]
  company_size?: { min?: number; max?: number }

  // Messaging
  value_prop: string
  proof_points?: string[]
  cta: string
  tone: "luxury_formal" | "consultative" | "direct"
  sequence_length: 3 | 5 | 7
  personalization_depth: "none" | "opener" | "opener_plus_company"
  reference_knowledge_ids?: string[]

  // Volume
  max_candidates: number
  max_enrich: number
  validation_strictness: "valid_only" | "valid_and_risky"

  // Suppression
  exclude_domains?: string[]
  apply_default_suppression: boolean

  // Send
  instantly_campaign_id: string
}

export type SqlVersion = {
  sql: string
  reasoning: string
  feedback?: string
  row_count?: number
  sample?: Record<string, unknown>[]
  excluded_sample?: Record<string, unknown>[]
  excluded_count?: number
  criteria?: {
    included: string[]
    excluded: string[]
  }
  ts: string
}

export type MasterCopy = {
  steps: EmailStep[]
  approved_at?: string
}

export type EmailStep = {
  subject: string
  body: string
  delay_days: number
}

export type Lead = {
  id: string
  campaign_id: string
  source_data: Record<string, unknown>
  email: string | null
  email_status: "valid" | "risky" | "invalid" | "catch_all" | "unknown" | null
  personalization: LeadPersonalization | null
  pushed_to_instantly_at: string | null
  instantly_lead_id: string | null
  created_at: string
}

export type LeadPersonalization = {
  first_line: string
  company_note: string
}

export type Knowledge = {
  id: string
  type: "doc" | "note" | "case_study" | "email_sample" | "transcript" | "brand"
  title: string
  content: string
  embedding?: number[]
  source: "upload" | "manual" | "conversation" | "auto"
  tags: string[]
  created_at: string
  updated_at: string
}

export type Instruction = {
  id: string
  rule: string
  category: "filter" | "tone" | "vocabulary" | "suppression"
  active: boolean
  created_at: string
  last_referenced_at: string | null
}

export type Outcome = {
  campaign_id: string
  sent_count: number
  opened_count: number
  replied_count: number
  positive_reply_count: number
  what_worked: string | null
  what_didnt: string | null
  notes: string | null
  updated_at: string
}
