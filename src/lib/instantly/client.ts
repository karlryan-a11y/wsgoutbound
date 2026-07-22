// Instantly.ai v2 API client
// Docs: https://developer.instantly.ai
// Leads are added one-per-request via POST /api/v2/leads with a `campaign`
// field. (There is NO /leads/bulk-add route in v2 — it 404s.)

const BASE_URL =
  process.env.INSTANTLY_BASE_URL || "https://api.instantly.ai/api/v2"
const PUSH_CONCURRENCY = 5 // parallel lead creates

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

/** Map our lead shape to the v2 POST /leads body (job_title → custom var). */
function toV2LeadBody(campaignId: string, lead: InstantlyLead) {
  const custom_variables: Record<string, string | number | boolean | null> = {
    ...(lead.custom_variables ?? {}),
  }
  if (lead.job_title) custom_variables.job_title = lead.job_title
  return {
    campaign: campaignId,
    email: lead.email,
    first_name: lead.first_name ?? undefined,
    last_name: lead.last_name ?? undefined,
    company_name: lead.company_name ?? undefined,
    phone: lead.phone ?? undefined,
    website: lead.website ?? undefined,
    custom_variables,
  }
}

/**
 * Push leads to an Instantly campaign. v2 has no bulk endpoint, so we create
 * leads individually with bounded concurrency. Per-lead failures are counted,
 * not fatal, so one bad row can't sink the whole push.
 */
export async function pushLeadsToInstantly(
  campaignId: string,
  leads: InstantlyLead[]
): Promise<{ totalPushed: number; failed: number; failures: string[] }> {
  let totalPushed = 0
  const failures: string[] = []

  for (let i = 0; i < leads.length; i += PUSH_CONCURRENCY) {
    const chunk = leads.slice(i, i + PUSH_CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map((lead) =>
        instantlyFetch("/leads", {
          method: "POST",
          body: JSON.stringify(toV2LeadBody(campaignId, lead)),
        })
      )
    )
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") totalPushed++
      else failures.push(chunk[j].email)
    })
  }

  return { totalPushed, failed: failures.length, failures }
}

// ── list campaigns ────────────────────────────────────────────────────

export async function listCampaigns() {
  return instantlyFetch("/campaigns")
}
