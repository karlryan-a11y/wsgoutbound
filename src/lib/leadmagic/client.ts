const BASE_URL = process.env.LEADMAGIC_BASE_URL || "https://api.leadmagic.io"

async function leadmagicFetch(path: string, options: RequestInit = {}) {
  const apiKey = process.env.LEADMAGIC_API_KEY
  if (!apiKey) throw new Error("Missing LEADMAGIC_API_KEY — set up LeadMagic account first")

  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LeadMagic API error: ${response.status} ${error}`)
  }

  return response.json()
}

type BulkEmailFinderRow = {
  first_name: string
  last_name: string
  company_domain: string
}

export async function submitBulkEmailFinder(rows: BulkEmailFinderRow[]) {
  return leadmagicFetch("/bulk/submit", {
    method: "POST",
    body: JSON.stringify({
      endpoint: "email-finder",
      product: "email_finder",
      rows,
    }),
  })
}

export async function getBulkJobStatus(jobId: string) {
  return leadmagicFetch(`/bulk/status/${jobId}`)
}

export async function getBulkJobResults(jobId: string) {
  return leadmagicFetch(`/bulk/results/${jobId}`)
}

export async function previewCost(rowCount: number, product: string = "email_finder") {
  return leadmagicFetch("/bulk/preview-cost", {
    method: "POST",
    body: JSON.stringify({
      product,
      row_count: rowCount,
    }),
  })
}
