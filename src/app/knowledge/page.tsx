"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type KnowledgeType = "doc" | "note" | "case_study" | "email_sample" | "transcript" | "brand"

type Entry = {
  id: string
  type: KnowledgeType
  title: string
  content: string
  source: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

const TYPE_LABELS: Record<KnowledgeType, string> = {
  doc: "Document",
  note: "Note",
  case_study: "Case Study",
  email_sample: "Winning Email",
  transcript: "Transcript",
  brand: "Brand Guide",
}

const TYPE_ORDER: KnowledgeType[] = ["brand", "case_study", "email_sample", "doc", "note", "transcript"]

const TYPE_COLORS: Record<KnowledgeType, string> = {
  brand: "var(--wsg-camel)",
  case_study: "var(--wsg-blue)",
  email_sample: "var(--wsg-green)",
  doc: "rgba(255,255,255,0.62)",
  note: "var(--wsg-butter)",
  transcript: "var(--wsg-blush)",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 0",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--line-strong)",
  color: "#fff",
  fontFamily: "var(--sans)",
  fontSize: "1rem",
  fontWeight: 300,
  lineHeight: 1.7,
  outline: "none",
  transition: "border-color 0.3s ease",
}

function focusCamel(e: React.FocusEvent<HTMLElement>) {
  ;(e.target as HTMLElement).style.borderBottomColor = "var(--wsg-camel)"
}
function blurLine(e: React.FocusEvent<HTMLElement>) {
  ;(e.target as HTMLElement).style.borderBottomColor = "var(--line-strong)"
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function TypeBadge({ type }: { type: KnowledgeType }) {
  return (
    <span
      className="eyebrow"
      style={{
        fontSize: "0.62rem",
        letterSpacing: "0.24em",
        color: TYPE_COLORS[type],
        border: `1px solid ${TYPE_COLORS[type]}`,
        padding: "0.25rem 0.6rem",
        opacity: 0.85,
      }}
    >
      {TYPE_LABELS[type]}
    </span>
  )
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // create form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState<KnowledgeType>("doc")
  const [tags, setTags] = useState("")

  // edit + expand state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editType, setEditType] = useState<KnowledgeType>("doc")
  const [editTags, setEditTags] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/knowledge")
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setEntries(data)
      } catch {
        /* ignore — empty state shows */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean)
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type, tags: parsedTags, source: "manual" }),
      })
      if (res.ok) {
        const created: Entry = await res.json()
        setEntries((prev) => [created, ...prev])
        setTitle("")
        setContent("")
        setType("doc")
        setTags("")
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  function startEdit(entry: Entry) {
    setEditId(entry.id)
    setExpandedId(entry.id)
    setEditTitle(entry.title)
    setEditContent(entry.content)
    setEditType(entry.type)
    setEditTags((entry.tags || []).join(", "))
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    const parsedTags = editTags.split(",").map((t) => t.trim()).filter(Boolean)
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent, type: editType, tags: parsedTags }),
      })
      if (res.ok) {
        const updated: Entry = await res.json()
        setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
        setEditId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return
    const prev = entries
    setEntries((p) => p.filter((e) => e.id !== id))
    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" })
    if (!res.ok) setEntries(prev) // rollback
  }

  const grouped = useMemo(() => {
    const map = new Map<KnowledgeType, Entry[]>()
    for (const e of entries) {
      const arr = map.get(e.type) || []
      arr.push(e)
      map.set(e.type, arr)
    }
    return map
  }, [entries])

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

      <div className="mb-4 flex items-end justify-between gap-6">
        <div>
          <span className="eyebrow mb-4 block">Reference Library</span>
          <h1 style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}>Knowledge</h1>
        </div>
        <button
          className="wsg-btn-ghost shrink-0"
          style={{ color: "#fff" }}
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Close" : "Add Entry"}
        </button>
      </div>

      <p
        className="mb-12"
        style={{ color: "rgba(255,255,255,0.7)", fontWeight: 300, maxWidth: "52ch" }}
      >
        Brand docs, winning emails, and case studies. Each entry is automatically embedded
        and referenced when generating search queries and email sequences.
      </p>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="wsg-card mb-16"
          style={{ padding: "clamp(1.5rem, 4vw, 2.5rem)" }}
        >
          <div className="space-y-8">
            <div>
              <label className="eyebrow mb-3 block" style={{ color: "rgba(255,255,255,0.68)" }}>
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. WSG Brand Voice Guide"
                required
                style={inputStyle}
                onFocus={focusCamel}
                onBlur={blurLine}
              />
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div>
                <label className="eyebrow mb-3 block" style={{ color: "rgba(255,255,255,0.68)" }}>
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as KnowledgeType)}
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                >
                  {TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="eyebrow mb-3 block" style={{ color: "rgba(255,255,255,0.68)" }}>
                  Tags (comma-separated)
                </label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="voice, luxury, finance"
                  style={inputStyle}
                  onFocus={focusCamel}
                  onBlur={blurLine}
                />
              </div>
            </div>
            <div>
              <label className="eyebrow mb-3 block" style={{ color: "rgba(255,255,255,0.68)" }}>
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the document, email, or notes here…"
                required
                rows={8}
                style={{ ...inputStyle, resize: "vertical" }}
                onFocus={focusCamel}
                onBlur={blurLine}
              />
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--line)", marginTop: "2rem", paddingTop: "1.5rem" }}>
            <button type="submit" className="wsg-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.56)", fontWeight: 300 }}>Loading…</p>
      ) : entries.length === 0 ? (
        <div
          className="wsg-surface"
          style={{ padding: "clamp(2.5rem, 6vw, 4rem)", textAlign: "center" }}
        >
          <p style={{ color: "rgba(255,255,255,0.74)", fontWeight: 300, maxWidth: "44ch", margin: "0 auto" }}>
            Your reference library is empty. Add brand docs, winning emails, and case studies.
            Each entry is automatically embedded and referenced when generating search queries
            and email sequences.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {TYPE_ORDER.filter((t) => grouped.has(t)).map((t) => (
            <section key={t}>
              <div
                className="mb-6 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.85rem" }}
              >
                <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 300 }}>
                  {TYPE_LABELS[t]}
                </h2>
                <span className="eyebrow" style={{ color: "var(--wsg-camel)" }}>
                  {grouped.get(t)!.length}
                </span>
              </div>

              <div className="space-y-3">
                {grouped.get(t)!.map((entry) => {
                  const isExpanded = expandedId === entry.id
                  const isEditing = editId === entry.id
                  return (
                    <div key={entry.id} className="wsg-surface" style={{ padding: "1.25rem 1.5rem" }}>
                      {isEditing ? (
                        <div className="space-y-6">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            style={inputStyle}
                            onFocus={focusCamel}
                            onBlur={blurLine}
                          />
                          <div className="grid grid-cols-2 gap-12">
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as KnowledgeType)}
                              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                            >
                              {TYPE_ORDER.map((tt) => (
                                <option key={tt} value={tt}>
                                  {TYPE_LABELS[tt]}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editTags}
                              onChange={(e) => setEditTags(e.target.value)}
                              placeholder="tags, comma-separated"
                              style={inputStyle}
                              onFocus={focusCamel}
                              onBlur={blurLine}
                            />
                          </div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={8}
                            style={{ ...inputStyle, resize: "vertical" }}
                            onFocus={focusCamel}
                            onBlur={blurLine}
                          />
                          <div className="flex gap-3">
                            <button
                              className="wsg-btn-primary"
                              onClick={() => handleSaveEdit(entry.id)}
                              disabled={saving}
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button className="wsg-btn-muted" onClick={() => setEditId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <button
                              className="text-left"
                              style={{ flex: 1, background: "transparent", border: "none", padding: 0 }}
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            >
                              <div className="mb-2 flex items-center gap-3">
                                <TypeBadge type={entry.type} />
                                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.52)" }}>
                                  {formatDate(entry.updated_at || entry.created_at)}
                                </span>
                              </div>
                              <div style={{ fontSize: "1.05rem", fontWeight: 400, color: "#fff" }}>
                                {entry.title}
                              </div>
                              {!isExpanded && (
                                <p
                                  className="mt-2"
                                  style={{
                                    fontSize: "0.88rem",
                                    fontWeight: 300,
                                    color: "rgba(255,255,255,0.7)",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {entry.content.slice(0, 200)}
                                  {entry.content.length > 200 ? "…" : ""}
                                </p>
                              )}
                            </button>
                            <div className="flex shrink-0 gap-3">
                              <button
                                className="eyebrow"
                                style={{ color: "var(--wsg-camel)", background: "transparent", border: "none" }}
                                onClick={() => startEdit(entry)}
                              >
                                Edit
                              </button>
                              <button
                                className="eyebrow"
                                style={{ color: "var(--wsg-red)", background: "transparent", border: "none" }}
                                onClick={() => handleDelete(entry.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4" style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
                              <p
                                style={{
                                  fontSize: "0.92rem",
                                  fontWeight: 300,
                                  color: "rgba(255,255,255,0.82)",
                                  lineHeight: 1.7,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {entry.content}
                              </p>
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {entry.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "rgba(255,255,255,0.68)",
                                        border: "1px solid var(--line)",
                                        padding: "0.2rem 0.55rem",
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
