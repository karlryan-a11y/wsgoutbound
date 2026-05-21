const BASE_URL = process.env.INSTANTLY_BASE_URL || "https://api.instantly.ai/api/v2"

async function instantlyFetch(path: string, options: RequestInit = {}) {
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
    throw new Error(`Instantly API error: ${response.status} ${error}`)
  }

  return response.json()
}

type InstantlyLead = {
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  custom_variables?: Record<string, string>
}

export async function pushLeadsToInstantly(
  campaignId: string,
  leads: InstantlyLead[]
) {
  return instantlyFetch("/leads", {
    method: "POST",
    body: JSON.stringify({
      campaign: campaignId,
      leads,
    }),
  })
}

export async function listCampaigns() {
  return instantlyFetch("/campaigns")
}
