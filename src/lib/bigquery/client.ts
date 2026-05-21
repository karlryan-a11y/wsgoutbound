import { BigQuery } from "@google-cloud/bigquery"

let _client: BigQuery | null = null

export function getBigQueryClient(): BigQuery {
  if (_client) return _client

  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) throw new Error("Missing GCP_PROJECT_ID")

  // Uses Application Default Credentials (ADC) locally
  // For Vercel, set GCP_SERVICE_ACCOUNT_JSON env var
  const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson)
    _client = new BigQuery({ projectId, credentials })
  } else {
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
