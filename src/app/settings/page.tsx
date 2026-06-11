"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

type ServiceCheck = {
  name: string
  status: "ok" | "error"
  message?: string
  latencyMs?: number
}

type EnvStatus = { key: string; set: boolean }

type HealthResponse = {
  checks: ServiceCheck[]
  envStatus: EnvStatus[]
  checkedAt: string
}

export default function SettingsPage() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const check = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/health", { cache: "no-store" })
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-check on mount. Inlined (not calling check() synchronously) so the
  // first setState happens after an await, not synchronously in the effect.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/settings/health", { cache: "no-store" })
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="mx-auto w-full max-w-[820px]"
      style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 4rem)" }}
    >
      <Link
        href="/"
        className="nav-link eyebrow mb-12 inline-block"
        style={{ color: "rgba(255,255,255,0.56)" }}
      >
        &larr; Back
      </Link>

      <div className="mb-16 flex items-end justify-between gap-6">
        <div>
          <span className="eyebrow mb-4 block">System</span>
          <h1 style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}>Settings</h1>
        </div>
        <button className="wsg-btn-ghost shrink-0" style={{ color: "#fff" }} onClick={check} disabled={loading}>
          {loading ? "Checking…" : "Check All"}
        </button>
      </div>

      {/* Integration Health */}
      <section className="mb-16">
        <div className="mb-6" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.85rem" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 300 }}>
            Integration Health
          </h2>
          {data?.checkedAt && (
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.52)", fontWeight: 300, marginTop: "0.35rem" }}>
              Last checked {new Date(data.checkedAt).toLocaleTimeString("en-US")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {loading && !data
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="wsg-surface" style={{ padding: "1.25rem 1.5rem", opacity: 0.4 }}>
                  <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.62)" }}>Checking…</span>
                </div>
              ))
            : (data?.checks || []).map((c) => (
                <div key={c.name} className="wsg-surface" style={{ padding: "1.25rem 1.5rem" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: c.status === "ok" ? "var(--wsg-green)" : "var(--wsg-red)",
                          boxShadow:
                            c.status === "ok"
                              ? "0 0 8px rgba(45,80,13,0.8)"
                              : "0 0 8px rgba(195,3,25,0.8)",
                        }}
                      />
                      <span style={{ fontSize: "1rem", fontWeight: 400, color: "#fff" }}>{c.name}</span>
                    </div>
                    {typeof c.latencyMs === "number" && (
                      <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.52)" }}>{c.latencyMs}ms</span>
                    )}
                  </div>
                  <p
                    className="mt-2"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 300,
                      color: c.status === "ok" ? "rgba(255,255,255,0.7)" : "var(--wsg-red)",
                    }}
                  >
                    {c.message || (c.status === "ok" ? "Connected" : "Unreachable")}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* Environment Variables */}
      <section>
        <div className="mb-6" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.85rem" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 300 }}>
            Environment Variables
          </h2>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.56)", fontWeight: 300, marginTop: "0.35rem" }}>
            Configured server-side. Values are never exposed.
          </p>
        </div>

        <div className="space-y-1">
          {(data?.envStatus || []).map((env) => (
            <div
              key={env.key}
              className="wsg-surface flex items-center justify-between"
              style={{ padding: "0.7rem 1.1rem" }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.82)",
                  fontFamily: "var(--font-mono, monospace)",
                  letterSpacing: "0.02em",
                }}
              >
                {env.key}
              </span>
              <span
                className="eyebrow"
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.24em",
                  color: env.set ? "var(--wsg-green)" : "var(--wsg-red)",
                  border: `1px solid ${env.set ? "var(--wsg-green)" : "var(--wsg-red)"}`,
                  padding: "0.22rem 0.6rem",
                }}
              >
                {env.set ? "Set" : "Missing"}
              </span>
            </div>
          ))}
          {!loading && (!data?.envStatus || data.envStatus.length === 0) && (
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.52)", fontWeight: 300 }}>
              Unable to read environment status.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
