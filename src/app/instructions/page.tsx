"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Category = "filter" | "tone" | "vocabulary" | "suppression"

type Instruction = {
  id: string
  rule: string
  category: Category
  active: boolean
  created_at: string
}

type Suppression = {
  id: string
  email: string | null
  domain: string | null
  reason: string | null
  created_at: string
}

const CATEGORIES: { key: Category; label: string; description: string; placeholder: string }[] = [
  {
    key: "filter",
    label: "Targeting Rules",
    description: "Applied when generating search queries",
    placeholder: "Never include companies under 50 employees",
  },
  {
    key: "tone",
    label: "Tone Rules",
    description: "Applied when writing email sequences",
    placeholder: "Keep the first line under 12 words",
  },
  {
    key: "vocabulary",
    label: "Vocabulary Rules",
    description: "Words and phrases to use or avoid",
    placeholder: "Never use the word 'synergy'",
  },
  {
    key: "suppression",
    label: "Suppression Rules",
    description: "Domains and contacts to always exclude",
    placeholder: "Exclude anyone at a competitor agency",
  },
]

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--line-strong)",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
  fontSize: "0.95rem",
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.3s ease",
}

function focusCamel(e: React.FocusEvent<HTMLElement>) {
  ;(e.target as HTMLElement).style.borderBottomColor = "var(--wsg-camel)"
}
function blurLine(e: React.FocusEvent<HTMLElement>) {
  ;(e.target as HTMLElement).style.borderBottomColor = "var(--line-strong)"
}

export default function InstructionsPage() {
  const [rules, setRules] = useState<Instruction[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<Category, string>>({
    filter: "",
    tone: "",
    vocabulary: "",
    suppression: "",
  })
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // suppression list
  const [suppressions, setSuppressions] = useState<Suppression[]>([])
  const [importText, setImportText] = useState("")
  const [importType, setImportType] = useState<"email" | "domain">("email")
  const [importing, setImporting] = useState(false)

  async function loadSuppressions() {
    try {
      const res = await fetch("/api/suppression")
      const data = await res.json()
      if (Array.isArray(data)) setSuppressions(data)
    } catch {
      // ignore
    }
  }

  // Initial load. Inlined (not calling a setState-ing function synchronously)
  // so the first setState happens after an await, not synchronously in the effect.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/instructions")
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setRules(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
      try {
        const res = await fetch("/api/suppression")
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setSuppressions(data)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function addRule(category: Category) {
    const rule = drafts[category].trim()
    if (!rule) return
    const res = await fetch("/api/instructions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule, category }),
    })
    if (res.ok) {
      const created: Instruction = await res.json()
      setRules((prev) => [created, ...prev])
      setDrafts((d) => ({ ...d, [category]: "" }))
    }
  }

  async function toggleRule(rule: Instruction) {
    const next = !rule.active
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: next } : r)))
    const res = await fetch(`/api/instructions/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    })
    if (!res.ok) setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r)))
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) return
    const res = await fetch(`/api/instructions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule: text }),
    })
    if (res.ok) {
      const updated: Instruction = await res.json()
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setEditId(null)
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return
    const prev = rules
    setRules((p) => p.filter((r) => r.id !== id))
    const res = await fetch(`/api/instructions/${id}`, { method: "DELETE" })
    if (!res.ok) setRules(prev)
  }

  async function importSuppressions() {
    const entries = importText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (entries.length === 0) return
    setImporting(true)
    try {
      const res = await fetch("/api/suppression/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, entryType: importType }),
      })
      if (res.ok) {
        setImportText("")
        await loadSuppressions()
      }
    } finally {
      setImporting(false)
    }
  }

  async function deleteSuppression(id: string) {
    const prev = suppressions
    setSuppressions((p) => p.filter((s) => s.id !== id))
    const res = await fetch(`/api/suppression/${id}`, { method: "DELETE" })
    if (!res.ok) setSuppressions(prev)
  }

  return (
    <div
      className="mx-auto w-full max-w-[820px]"
      style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 4rem)" }}
    >
      <Link
        href="/"
        className="nav-link eyebrow mb-12 inline-block"
        style={{ color: "rgba(0, 0, 0,0.5)" }}
      >
        &larr; Back
      </Link>

      <div
        className="accent-block mb-12"
        style={{ padding: "clamp(1.5rem, 3vw, 2.25rem)" }}
      >
        <p className="eyebrow-num mb-4">
          <b>—</b> Always-Apply
        </p>
        <h1 className="mb-4" style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}>
          Rules
        </h1>
        <p style={{ color: "var(--ink-soft)", fontWeight: 300, maxWidth: "52ch", lineHeight: 1.6 }}>
          These rules are injected into every query and email generation
          automatically — this is how the system learns your preferences.
        </p>
      </div>

      <div className="space-y-16">
        {CATEGORIES.map((cat) => {
          const catRules = rules.filter((r) => r.category === cat.key)
          return (
            <section key={cat.key}>
              <div className="mb-6" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.85rem" }}>
                <div className="flex items-center justify-between">
                  <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 300 }}>
                    {cat.label}
                  </h2>
                  <span className="eyebrow" style={{ color: "var(--wsg-camel)" }}>
                    {catRules.length}
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(0, 0, 0,0.5)", fontWeight: 300, marginTop: "0.35rem" }}>
                  {cat.description}
                </p>
              </div>

              <div className="space-y-2">
                {!loading && catRules.length === 0 && (
                  <p style={{ fontSize: "0.85rem", color: "rgba(0, 0, 0,0.46)", fontWeight: 300, fontStyle: "italic" }}>
                    No {cat.label.toLowerCase()} yet. Example: &ldquo;{cat.placeholder}&rdquo;
                  </p>
                )}

                {catRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="wsg-surface flex items-center gap-4"
                    style={{ padding: "0.85rem 1.1rem", opacity: rule.active ? 1 : 0.45 }}
                  >
                    <button
                      role="switch"
                      aria-checked={rule.active}
                      onClick={() => toggleRule(rule)}
                      style={{
                        width: 34,
                        height: 18,
                        flexShrink: 0,
                        background: rule.active ? "var(--wsg-camel)" : "rgba(0, 0, 0,0.12)",
                        border: "none",
                        position: "relative",
                        transition: "background 0.3s ease",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: rule.active ? 18 : 2,
                          width: 14,
                          height: 14,
                          background: rule.active ? "var(--paper)" : "var(--ink)",
                          transition: "left 0.25s ease",
                        }}
                      />
                    </button>

                    {editId === rule.id ? (
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(rule.id)
                          if (e.key === "Escape") setEditId(null)
                        }}
                        style={{ ...inputStyle, padding: "0.2rem 0", flex: 1 }}
                        onFocus={focusCamel}
                        onBlur={blurLine}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: 300, color: "var(--ink)" }}>
                        {rule.rule}
                      </span>
                    )}

                    <div className="flex shrink-0 gap-3">
                      {editId === rule.id ? (
                        <button
                          className="eyebrow"
                          style={{ color: "var(--wsg-camel)", background: "transparent", border: "none" }}
                          onClick={() => saveEdit(rule.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          className="eyebrow"
                          style={{ color: "rgba(0, 0, 0,0.45)", background: "transparent", border: "none" }}
                          onClick={() => {
                            setEditId(rule.id)
                            setEditText(rule.rule)
                          }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="eyebrow"
                        style={{ color: "var(--wsg-red)", background: "transparent", border: "none" }}
                        onClick={() => deleteRule(rule.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add rule inline */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    value={drafts[cat.key]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addRule(cat.key)
                    }}
                    placeholder={cat.placeholder}
                    style={inputStyle}
                    onFocus={focusCamel}
                    onBlur={blurLine}
                  />
                  <button className="wsg-btn-muted shrink-0" onClick={() => addRule(cat.key)}>
                    Add
                  </button>
                </div>
              </div>
            </section>
          )
        })}

        {/* Suppression list */}
        <section>
          <div className="mb-6" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.85rem" }}>
            <div className="flex items-center justify-between">
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 300 }}>
                Suppression List
              </h2>
              <span className="eyebrow" style={{ color: "var(--wsg-camel)" }}>
                {suppressions.length}
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "rgba(0, 0, 0,0.5)", fontWeight: 300, marginTop: "0.35rem" }}>
              Emails and domains excluded from every campaign
            </p>
          </div>

          <div className="wsg-card mb-6" style={{ padding: "clamp(1.25rem, 3vw, 2rem)" }}>
            <label className="eyebrow mb-3 block" style={{ color: "rgba(0, 0, 0,0.5)" }}>
              Bulk Import — one per line
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                importType === "email"
                  ? "jane@acme.com\njohn@example.com"
                  : "competitor.com\nexample.com"
              }
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={focusCamel}
              onBlur={blurLine}
            />
            <div className="mt-5 flex items-center gap-3">
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as "email" | "domain")}
                style={{ ...inputStyle, width: "auto", appearance: "none", cursor: "pointer", paddingRight: "1.5rem" }}
              >
                <option value="email">Emails</option>
                <option value="domain">Domains</option>
              </select>
              <button className="wsg-btn-primary" onClick={importSuppressions} disabled={importing}>
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>

          {suppressions.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "rgba(0, 0, 0,0.46)", fontWeight: 300, fontStyle: "italic" }}>
              No suppressions yet. Imported emails and domains will be excluded from all future campaigns.
            </p>
          ) : (
            <div className="space-y-1">
              {suppressions.map((s) => (
                <div
                  key={s.id}
                  className="wsg-surface flex items-center justify-between"
                  style={{ padding: "0.6rem 1.1rem" }}
                >
                  <span style={{ fontSize: "0.88rem", fontWeight: 300, color: "var(--ink)" }}>
                    {s.email || s.domain}
                    {s.domain && !s.email && (
                      <span className="eyebrow" style={{ marginLeft: "0.75rem", color: "rgba(0, 0, 0,0.46)" }}>
                        Domain
                      </span>
                    )}
                  </span>
                  <button
                    className="eyebrow"
                    style={{ color: "var(--wsg-red)", background: "transparent", border: "none" }}
                    onClick={() => deleteSuppression(s.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
