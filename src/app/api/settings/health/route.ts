import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

type ServiceCheck = {
  name: string
  status: "ok" | "error"
  message?: string
  latencyMs?: number
}

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "VOYAGE_API_KEY",
  "LEADMAGIC_API_KEY",
  "INSTANTLY_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GCP_SERVICE_ACCOUNT_JSON",
  "INNGEST_EVENT_KEY",
]

export async function GET() {
  const checks: ServiceCheck[] = []

  // Supabase
  const supaStart = Date.now()
  try {
    const db = supabaseServer()
    const { error } = await db.from("campaigns").select("id").limit(1)
    checks.push({
      name: "Supabase",
      status: error ? "error" : "ok",
      message: error?.message,
      latencyMs: Date.now() - supaStart,
    })
  } catch (e) {
    checks.push({ name: "Supabase", status: "error", message: String(e), latencyMs: Date.now() - supaStart })
  }

  // Anthropic
  const anthStart = Date.now()
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
    })
    checks.push({
      name: "Anthropic",
      status: res.ok ? "ok" : "error",
      message: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - anthStart,
    })
  } catch (e) {
    checks.push({ name: "Anthropic", status: "error", message: String(e), latencyMs: Date.now() - anthStart })
  }

  // LeadMagic
  const lmStart = Date.now()
  try {
    const res = await fetch(`${process.env.LEADMAGIC_BASE_URL || "https://api.leadmagic.io"}/credits`, {
      method: "POST",
      headers: { "X-API-Key": process.env.LEADMAGIC_API_KEY || "", "Content-Type": "application/json" },
      body: "{}",
    })
    if (res.ok) {
      const data = await res.json()
      checks.push({
        name: "LeadMagic",
        status: "ok",
        message: `${data.credits ?? data.remaining ?? "?"} credits remaining`,
        latencyMs: Date.now() - lmStart,
      })
    } else {
      checks.push({ name: "LeadMagic", status: "error", message: `HTTP ${res.status}`, latencyMs: Date.now() - lmStart })
    }
  } catch (e) {
    checks.push({ name: "LeadMagic", status: "error", message: String(e), latencyMs: Date.now() - lmStart })
  }

  // Instantly
  const instStart = Date.now()
  try {
    const res = await fetch(`${process.env.INSTANTLY_BASE_URL || "https://api.instantly.ai/api/v2"}/campaigns?limit=1`, {
      headers: { Authorization: `Bearer ${process.env.INSTANTLY_API_KEY || ""}` },
    })
    checks.push({
      name: "Instantly",
      status: res.ok ? "ok" : "error",
      message: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - instStart,
    })
  } catch (e) {
    checks.push({ name: "Instantly", status: "error", message: String(e), latencyMs: Date.now() - instStart })
  }

  // Voyage
  const voyStart = Date.now()
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: process.env.VOYAGE_MODEL || "voyage-3", input: ["health check"], input_type: "document" }),
    })
    checks.push({
      name: "Voyage AI",
      status: res.ok ? "ok" : "error",
      message: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - voyStart,
    })
  } catch (e) {
    checks.push({ name: "Voyage AI", status: "error", message: String(e), latencyMs: Date.now() - voyStart })
  }

  const envStatus = ENV_KEYS.map((key) => ({ key, set: !!process.env[key] }))

  return NextResponse.json({ checks, envStatus, checkedAt: new Date().toISOString() })
}
