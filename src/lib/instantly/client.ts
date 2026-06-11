// Instantly.ai v2 API client
// Docs: https://developer.instantly.ai
// Bulk-add: POST /api/v2/leads/bulk-add (up to 1000 leads per request)

const BASE_URL =
  process.env.INSTANTLY_BASE_URL || "https://api.instantly.ai/api/v2"
const BULK_ADD_LIMIT = 1000

// ── types ──────────────────────────────────────────────────────────────

export type InstantlyLead = {
  email: string
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  job_title?: string | null
  phone?: string | null
  website?: string | null
  personalization?: string | null
  custom_variables?: Record<string, string | number | boolean | null>
}

export type BulkAddRequest = {
  campaign_id: string
  leads: InstantlyLead[]
  skip_if_in_workspace?: boolean
  skip_if_in_campaign?: boolean
}

export type BulkAddResponse = {
  upload_id?: string
  total?: number
  valid?: number
  skipped?: number
  failed?: number
  [key: string]: unknown
}

// ── core fetch ─────────────────────────────────────────────────────────

async function instantlyFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.INSTANTLY_API_KEY
  if (!apiKey) throw new Error("Missing INSTANTLY_API_KEY")

  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Instantly API ${response.status}: ${error}`)
  }

  return response.json() as Promise<T>
}

// ── bulk-add leads ────────────────────────────────────────────────────

/**
 * Push leads to an Instantly campaign via v2 bulk-add.
 * Automatically chunks into batches of 1000.
 * Returns aggregated results.
 */
export async function pushLeadsToInstantly(
  campaignId: string,
  leads: InstantlyLead[]
): Promise<{ batches: BulkAddResponse[]; totalPushed: number }> {
  const results: BulkAddResponse[] = []
  let totalPushed = 0

  for (let i = 0; i < leads.length; i += BULK_ADD_LIMIT) {
    const batch = leads.slice(i, i + BULK_ADD_LIMIT)

    const body: BulkAddRequest = {
      campaign_id: campaignId,
      leads: batch,
      skip_if_in_workspace: true,
      skip_if_in_campaign: true,
    }

    const res = await instantlyFetch<BulkAddResponse>("/leads/bulk-add", {
      method: "POST",
      body: JSON.stringify(body),
    })

    results.push(res)
    totalPushed += batch.length
  }

  return { batches: results, totalPushed }
}

// ── list campaigns ────────────────────────────────────────────────────

export async function listCampaigns() {
  return instantlyFetch("/campaigns")
}
