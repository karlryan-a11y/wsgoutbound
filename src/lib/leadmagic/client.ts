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
}

// ── core fetch ─────────────────────────────────────────────────────────

async function leadmagicFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = process.env.LEADMAGIC_API_KEY
  if (!apiKey) throw new Error("Missing LEADMAGIC_API_KEY")

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
    return {
      email: null,
      email_status: null,
      credits_used: 0,
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

/**
 * Enrich a batch of leads with rate limiting.
 * Processes up to RPS_LIMIT per second.
 * Returns results in the same order as input.
 */
export async function enrichBatch(
  leads: EmailFinderRequest[]
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = []

  for (let i = 0; i < leads.length; i += RPS_LIMIT) {
    const chunk = leads.slice(i, i + RPS_LIMIT)

    // Fire chunk concurrently
    const chunkResults = await Promise.all(chunk.map((lead) => findEmail(lead)))
    results.push(...chunkResults)

    // Rate limit: wait 1 second between chunks (unless last chunk)
    if (i + RPS_LIMIT < leads.length) {
      await sleep(1100)
    }
  }

  return results
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
