import { BigQuery } from "@google-cloud/bigquery"
import { ExternalAccountClient } from "google-auth-library"
import { getVercelOidcToken } from "@vercel/functions/oidc"

let _client: BigQuery | null = null

// Build a keyless Workload Identity Federation auth client that exchanges
// Vercel's per-deployment OIDC token for short-lived, impersonated credentials
// of the wsgoutbound-bq-reader service account. No stored secret, never expires.
// Returns null when the WIF env vars aren't configured (e.g. local dev).
function buildWifAuthClient() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
  const saEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL
  if (!projectNumber || !poolId || !providerId || !saEmail) return null

  return ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    subject_token_supplier: {
      // Vercel injects a fresh OIDC token per invocation when OIDC is enabled.
      getSubjectToken: () => getVercelOidcToken(),
    },
  })
}

export function getBigQueryClient(): BigQuery {
  if (_client) return _client

  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) throw new Error("Missing GCP_PROJECT_ID")

  // 1) Preferred (production): keyless Workload Identity Federation
  const wifClient = buildWifAuthClient()
  if (wifClient) {
    _client = new BigQuery({ projectId, authClient: wifClient })
    return _client
  }

  // 2) Fallback: explicit credentials JSON (service_account or authorized_user)
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
    return _client
  }

  // 3) Local dev: Application Default Credentials (gcloud auth)
  _client = new BigQuery({ projectId })
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
