import { BigQuery } from "@google-cloud/bigquery"

let _client: BigQuery | null = null

export function getBigQueryClient(): BigQuery {
  if (_client) return _client

  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) throw new Error("Missing GCP_PROJECT_ID")

  // For Vercel/production: set GCP_SERVICE_ACCOUNT_JSON env var
  // Supports both service_account and authorized_user credential types
  const credJson = process.env.GCP_SERVICE_ACCOUNT_JSON
  if (credJson) {
    const parsed = JSON.parse(credJson)

    if (parsed.type === "authorized_user") {
      // Write to temp file so Google Auth SDK can pick it up via ADC
      const fs = require("fs")
      const tmpPath = "/tmp/gcp-credentials.json"
      fs.writeFileSync(tmpPath, credJson)
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath
      _client = new BigQuery({ projectId })
    } else {
      _client = new BigQuery({ projectId, credentials: parsed })
    }
  } else {
    // Uses Application Default Credentials (ADC) locally
    _client = new BigQuery({ projectId })
  }

  return _client
}

export const DATASET = process.env.GCP_BIGQUERY_DATASET || "apollo"

export type BQQueryResult = {
  rows: Record<string, unknown>[]
  totalRows: number
}

export async function runQuery(
  sql: string,
  options?: { limit?: number }
): Promise<BQQueryResult> {
  const client = getBigQueryClient()
  const limit = options?.limit ?? 1000

  // Safety: ensure LIMIT is present
  const safeSql = sql.match(/\bLIMIT\b/i) ? sql : `${sql} LIMIT ${limit}`

  const [rows] = await client.query({
    query: safeSql,
    location: process.env.GCP_BIGQUERY_LOCATION || "US",
  })

  return {
    rows: rows as Record<string, unknown>[],
    totalRows: rows.length,
  }
}
