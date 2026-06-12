// LeadMagic API client — verified against docs
// Single email-finder endpoint: POST /v1/people/email-finder
// 1 credit per successful lookup

const BASE_URL =
  process.env.LEADMAGIC_BASE_URL || "https://api.leadmagic.io"
const RPS_LIMIT = Number(process.env.RATE_LIMIT_LEADMAGIC_RPS) || 5

// ── types ──────────────────────────────────────────────────────────────

export type EmailFinderRequest = {
  first_name?: string
  last_name?: string
  full_name?: string
  domain?: string
  company_name?: string
}

export type EmailFinderResponse = {
  email: string | null
  status: "valid" | null
  credits_consumed: number
  message: string
  employment_verified?: boolean
  mx_record?: string
  mx_provider?: string
  has_mx?: boolean
  company_name?: string
  company_industry?: string
  company_size?: string
}

export type EnrichmentResult = {
  email: string | null
  email_status: "valid" | "risky" | "invalid" | "catch_all" | "unknown" | null
  credits_used: number
  raw: EmailFinderResponse
  error?: string
}

/** Thrown when LeadMagic returns an API-wide error (credits, auth, rate limit) */
export class LeadMagicApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = "LeadMagicApiError"
  }

  get userFacingReason(): string {
    if (this.statusCode === 402 || this.statusCode === 403) {
      return "Out of LeadMagic credits — top up at leadmagic.io/billing"
    }
    if (this.statusCode === 429) {
      return "LeadMagic rate limit exceeded — try again in a few minutes"
    }
    if (this.statusCode === 401) {
      return "LeadMagic API key is invalid or expired"
    }
    if (this.statusCode >= 500) {
      return "LeadMagic service is temporarily unavailable"
    }
    return `LeadMagic API error (${this.statusCode})`
  }
}

// ── core fetch ─────────────────────────────────────────────────────────

async function leadmagicFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = process.env.LEADMAGIC_API_KEY
  if (!apiKey) throw new LeadMagicApiError(401, "Missing LEADMAGIC_API_KEY env var")

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    // API-wide errors that should stop the whole enrichment
    if ([401, 402, 403, 429].includes(res.status) || res.status >= 500) {
      throw new LeadMagicApiError(res.status, `LeadMagic ${res.status}: ${text}`)
    }
    // Per-lead errors (400, 404, etc.) — throw generic so findEmail can catch
    throw new Error(`LeadMagic ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── single email finder ────────────────────────────────────────────────

export async function findEmail(
  req: EmailFinderRequest
): Promise<EnrichmentResult> {
  try {
    const raw = await leadmagicFetch<EmailFinderResponse>(
      "/v1/people/email-finder",
      req as Record<string, unknown>
    )

    return {
      email: raw.email,
      email_status: raw.status === "valid" ? "valid" : null,
      credits_used: raw.credits_consumed ?? 0,
      raw,
    }
  } catch (err) {
    // Re-throw API-wide errors (credits, auth, rate limit) so batch stops
    if (err instanceof LeadMagicApiError) throw err

    return {
      email: null,
      email_status: null,
      credits_used: 0,
      error: err instanceof Error ? err.message : "Unknown error",
      raw: {
        email: null,
        status: null,
        credits_consumed: 0,
        message: err instanceof Error ? err.message : "Unknown error",
      },
    }
  }
}

// ── batch enrichment with rate limiting ────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Max consecutive leads that return null before we flag a potential issue */
const MAX_CONSECUTIVE_FAILURES = 20

/**
 * Enrich a batch of leads with rate limiting.
 * Processes up to RPS_LIMIT per second.
 * Returns results in the same order as input.
 * Throws LeadMagicApiError for API-wide issues (credits, auth, etc.)
 */
export async function enrichBatch(
  leads: EmailFinderRequest[]
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = []
  let consecutiveFailures = 0

  for (let i = 0; i < leads.length; i += RPS_LIMIT) {
    const chunk = leads.slice(i, i + RPS_LIMIT)

    // Fire chunk concurrently — LeadMagicApiError will propagate up
    const chunkResults = await Promise.all(chunk.map((lead) => findEmail(lead)))
    results.push(...chunkResults)

    // Track consecutive failures (all results in chunk have errors)
    const allFailed = chunkResults.every((r) => r.email === null && r.error)
    if (allFailed) {
      consecutiveFailures += chunkResults.length
    } else {
      consecutiveFailures = 0
    }

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const lastErr = chunkResults.find((r) => r.error)?.error ?? "Unknown"
      throw new LeadMagicApiError(
        0,
        `${consecutiveFailures} consecutive enrichment failures — last error: ${lastErr}`
      )
    }

    // Rate limit: wait 1 second between chunks (unless last chunk)
    if (i + RPS_LIMIT < leads.length) {
      await sleep(1100)
    }
  }

  return results
}

// ── credit balance (pre-flight) ────────────────────────────────────────

export async function getCreditBalance(): Promise<number> {
  try {
    const raw = await leadmagicFetch<{ credits?: number; credits_liquid?: number }>(
      "/credits",
      {}
    )
    return Number(raw.credits_liquid ?? raw.credits ?? 0) || 0
  } catch {
    // If the balance check fails, return -1 so callers can decide (don't block)
    return -1
  }
}

// ── email validation (any email — work or personal) ────────────────────

type ValidateResponse = {
  email: string
  email_status: string
  credits_consumed: number
  message?: string
}

function mapStatus(s: string | null | undefined): EnrichmentResult["email_status"] {
  switch ((s || "").toLowerCase()) {
    case "valid":
      return "valid"
    case "invalid":
      return "invalid"
    case "catch_all":
    case "valid_catch_all":
      return "catch_all"
    case "risky":
      return "risky"
    case "unknown":
      return "unknown"
    default:
      return s ? "unknown" : null
  }
}

export async function validateEmail(email: string): Promise<EnrichmentResult> {
  try {
    const raw = await leadmagicFetch<ValidateResponse>("/email-validate", { email })
    return {
      email: raw.email || email,
      email_status: mapStatus(raw.email_status),
      credits_used: raw.credits_consumed ?? 0,
      raw: { email: raw.email, status: null, credits_consumed: raw.credits_consumed ?? 0, message: raw.message ?? "" },
    }
  } catch (err) {
    if (err instanceof LeadMagicApiError) throw err
    return {
      email: null,
      email_status: null,
      credits_used: 0,
      error: err instanceof Error ? err.message : "Unknown error",
      raw: { email: null, status: null, credits_consumed: 0, message: "validate error" },
    }
  }
}

// ── personal email finder (from LinkedIn profile) ──────────────────────

type PersonalResponse = {
  first_personal_email?: string | null
  personal_emails?: string[]
  credits_consumed: number
  message?: string
}

export async function findPersonalEmail(profileUrl: string): Promise<EnrichmentResult> {
  try {
    const raw = await leadmagicFetch<PersonalResponse>("/personal-email-finder", {
      profile_url: profileUrl,
    })
    const email = raw.first_personal_email || raw.personal_emails?.[0] || null
    return {
      email,
      // Personal/free-provider emails can't be SMTP-verified anywhere
      email_status: email ? "unknown" : null,
      credits_used: raw.credits_consumed ?? 0,
      raw: { email, status: null, credits_consumed: raw.credits_consumed ?? 0, message: raw.message ?? "" },
    }
  } catch (err) {
    if (err instanceof LeadMagicApiError) throw err
    return {
      email: null,
      email_status: null,
      credits_used: 0,
      error: err instanceof Error ? err.message : "Unknown error",
      raw: { email: null, status: null, credits_consumed: 0, message: "personal-finder error" },
    }
  }
}

// ── waterfall: validate-existing → find-work → (optional) find-personal ──

const FREE_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "me.com", "live.com", "msn.com", "comcast.net", "proton.me",
])

export type EnrichSource = "bq_validated" | "work_finder" | "personal_finder" | "none"
export type WaterfallResult = EnrichmentResult & { source: EnrichSource }

/** Pull the best existing email out of a BigQuery row (prefer a work domain). */
export function extractExistingEmail(d: Record<string, unknown>): string | null {
  const raw = str(d.person_email) || str(d.emails) || str(d.email)
  if (!raw) return null
  const list = raw.split(",").map((e) => e.trim()).filter((e) => e.includes("@"))
  if (list.length === 0) return null
  // Prefer a non-free-provider (work) email; else the first one
  const work = list.find((e) => !FREE_PROVIDERS.has((e.split("@")[1] || "").toLowerCase()))
  return work || list[0]
}

export function extractProfileUrl(d: Record<string, unknown>): string | null {
  const url = str(d.linkedin_url) || str(d.person_linkedin_url) || str(d.linkedin_username)
  if (!url) return null
  if (url.includes("linkedin.com")) return url.startsWith("http") ? url : `https://${url}`
  // bare username
  return `https://linkedin.com/in/${url}`
}

/**
 * Run the per-lead waterfall. Makes 1–3 LeadMagic calls, cheapest first.
 * Returns the chosen email + how many credits were actually consumed.
 * Throws LeadMagicApiError on API-wide failures (credits/auth/rate-limit).
 */
export async function enrichLeadWaterfall(
  sourceData: Record<string, unknown>,
  opts: { findPersonal: boolean }
): Promise<WaterfallResult> {
  let creditsUsed = 0
  const blank: WaterfallResult = {
    email: null, email_status: null, credits_used: 0,
    raw: { email: null, status: null, credits_consumed: 0, message: "no match" },
    source: "none",
  }

  // Step 1 — validate an email that's already in BigQuery (0.25cr work / 0 free)
  const existing = extractExistingEmail(sourceData)
  if (existing) {
    const v = await validateEmail(existing)
    creditsUsed += v.credits_used
    // Keep anything that isn't outright invalid (valid/catch_all/risky/unknown)
    if (v.email && v.email_status && v.email_status !== "invalid") {
      return { ...v, email: existing, credits_used: creditsUsed, source: "bq_validated" }
    }
  }

  // Step 2 — find a verified work email (1cr on hit, 0 on miss)
  const req = extractLeadForEnrichment(sourceData)
  if (req) {
    const w = await findEmail(req)
    creditsUsed += w.credits_used
    if (w.email) {
      return { ...w, email_status: w.email_status ?? "valid", credits_used: creditsUsed, source: "work_finder" }
    }
  }

  // Step 3 — OPTIONAL: find a personal email from LinkedIn (1cr on hit)
  if (opts.findPersonal) {
    const url = extractProfileUrl(sourceData)
    if (url) {
      const p = await findPersonalEmail(url)
      creditsUsed += p.credits_used
      if (p.email) {
        return { ...p, credits_used: creditsUsed, source: "personal_finder" }
      }
    }
  }

  return { ...blank, credits_used: creditsUsed }
}

/**
 * Process a batch of leads through the waterfall, sequentially (keeps us well
 * under the LeadMagic RPS limit since each lead makes up to 3 calls), and
 * STOPS as soon as `creditBudget` credits have been consumed. Misses cost 0.
 */
export async function enrichBatchWaterfall(
  items: { leadId: string; sourceData: Record<string, unknown> }[],
  opts: { findPersonal: boolean; creditBudget: number }
): Promise<{
  results: { leadId: string; result: WaterfallResult }[]
  creditsUsed: number
  stoppedAtCap: boolean
}> {
  const results: { leadId: string; result: WaterfallResult }[] = []
  let creditsUsed = 0
  let stoppedAtCap = false

  for (const item of items) {
    if (creditsUsed >= opts.creditBudget) {
      stoppedAtCap = true
      break
    }
    const result = await enrichLeadWaterfall(item.sourceData, {
      findPersonal: opts.findPersonal,
    })
    creditsUsed += result.credits_used
    results.push({ leadId: item.leadId, result })
    await sleep(220) // ~4.5 req/s ceiling, safely under the 5 RPS limit
  }

  return { results, creditsUsed, stoppedAtCap }
}

// ── extract lead data for email finder ─────────────────────────────────

/**
 * Extract first_name, last_name, domain/company_name from a BigQuery row.
 * Handles both `people` and `linkedin_us` table schemas.
 */
export function extractLeadForEnrichment(
  sourceData: Record<string, unknown>
): EmailFinderRequest | null {
  const d = sourceData

  // Try to get first name
  const firstName =
    str(d.first_name) ||
    str(d.person_first_name_unanalyzed) ||
    splitFirst(str(d.full_name) || str(d.person_name))

  // Try to get last name
  const lastName =
    str(d.last_name) ||
    str(d.person_last_name_unanalyzed) ||
    splitLast(str(d.full_name) || str(d.person_name))

  // Try to get domain
  const domain = extractDomain(
    str(d.company_website) ||
    str(d.person_email) ||
    str(d.emails)
  )

  // Try to get company name
  const companyName =
    str(d.company_name) ||
    str(d.sanitized_organization_name_unanalyzed)

  // Need at least a name and a company identifier
  if (!firstName && !lastName) return null
  if (!domain && !companyName) return null

  const req: EmailFinderRequest = {}
  if (firstName) req.first_name = firstName
  if (lastName) req.last_name = lastName
  if (domain) req.domain = domain
  if (!domain && companyName) req.company_name = companyName

  return req
}

// ── helpers ────────────────────────────────────────────────────────────

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim()
  return null
}

function splitFirst(name: string | null): string | null {
  if (!name) return null
  const parts = name.split(/\s+/)
  return parts[0] || null
}

function splitLast(name: string | null): string | null {
  if (!name) return null
  const parts = name.split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : null
}

function extractDomain(value: string | null): string | null {
  if (!value) return null
  // If it looks like an email, grab the domain
  if (value.includes("@")) {
    const domain = value.split("@")[1]
    return domain || null
  }
  // If it looks like a URL, extract the hostname
  try {
    const url = value.startsWith("http") ? value : `https://${value}`
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "") || null
  } catch {
    // If it's already a bare domain-like string
    if (value.includes(".") && !value.includes(" ")) {
      return value.replace(/^www\./, "")
    }
    return null
  }
}
