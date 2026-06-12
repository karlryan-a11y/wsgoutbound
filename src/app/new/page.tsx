"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createCampaign } from "./actions"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="eyebrow mb-3 block"
        style={{ color: "rgba(0, 0, 0,0.5)" }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 0",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--line-strong)",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
  fontSize: "1rem",
  fontWeight: 300,
  lineHeight: 1.7,
  outline: "none",
  transition: "border-color 0.3s ease",
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
}

function NewCampaignForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefill = searchParams.get("q")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await createCampaign(formData)

    if (result.ok) {
      router.push(`/c/${result.campaignId}`)
    } else {
      setLoading(false)
      alert(result.error)
    }
  }

  return (
    <div
      className="mx-auto w-full max-w-[720px]"
      style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 4rem)" }}
    >
      {/* Back link */}
      <Link
        href="/"
        className="nav-link eyebrow mb-12 inline-block"
        style={{ color: "rgba(0, 0, 0,0.5)" }}
      >
        &larr; Back
      </Link>

      <span className="eyebrow mb-4 block">Create</span>
      <h1
        className="mb-6"
        style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}
      >
        New Campaign
      </h1>

      {prefill && (
        <div
          className="mb-12"
          style={{
            padding: "1rem 1.5rem",
            border: "1px solid var(--wsg-camel)",
            background: "rgba(190, 123, 68, 0.06)",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "rgba(0, 0, 0,0.6)", fontWeight: 300 }}>
            Parsed from your description — edit any fields below.
          </p>
        </div>
      )}

      {!prefill && <div className="mb-16" />}

      <form onSubmit={handleSubmit}>
        {/* ── Section: Basics ──────────────────────────────────────── */}
        <div className="mb-16">
          <div
            className="mb-8 flex items-center gap-4"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: "0.85rem",
                fontStyle: "italic",
                color: "var(--wsg-muted)",
                paddingBottom: "1rem",
              }}
            >
              01
            </span>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.5rem",
                fontWeight: 300,
                paddingBottom: "1rem",
              }}
            >
              Basics
            </h2>
          </div>
          <div className="space-y-8">
            <Field label="Campaign Name">
              <input
                name="name"
                placeholder="e.g. Family Offices CA Q1"
                required
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
          </div>
        </div>

        {/* ── Section: Targeting ───────────────────────────────────── */}
        <div className="mb-16">
          <div
            className="mb-8 flex items-center gap-4"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: "0.85rem",
                fontStyle: "italic",
                color: "var(--wsg-muted)",
                paddingBottom: "1rem",
              }}
            >
              02
            </span>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.5rem",
                fontWeight: 300,
                paddingBottom: "1rem",
              }}
            >
              Targeting
            </h2>
          </div>
          <div className="space-y-8">
            <Field label="Who are you reaching?">
              <textarea
                name="persona"
                defaultValue={prefill || ""}
                placeholder="Describe who you're targeting — e.g. CFOs and VPs of Finance at mid-market companies in California"
                required
                rows={3}
                style={{ ...inputStyle, resize: "vertical" as const }}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <Field label="Job titles to target">
              <input
                name="titles_include"
                placeholder="CFO, VP Finance, Controller, Director of Finance"
                required
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <Field label="Job titles to skip (optional)">
              <input
                name="titles_exclude"
                placeholder="Intern, Student, Retired"
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <Field label="Locations">
              <input
                name="geographies"
                placeholder="California, New York, Texas"
                required
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <Field label="Industries (optional)">
              <input
                name="industries"
                placeholder="Real Estate, Manufacturing, Healthcare"
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <Field label="Gender (optional)">
              <select name="gender" defaultValue="any" style={selectStyle}>
                <option value="any">Any</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </Field>
            <label
              className="flex cursor-pointer items-start gap-3"
              style={{ padding: "0.5rem 0" }}
            >
              <input
                type="checkbox"
                name="enrich_personal_emails"
                style={{ marginTop: "0.25rem", accentColor: "var(--wsg-camel)", width: "1rem", height: "1rem" }}
              />
              <span>
                <span style={{ fontSize: "0.95rem", color: "var(--ink)", fontWeight: 400 }}>
                  Also find personal emails
                </span>
                <span style={{ display: "block", fontSize: "0.82rem", color: "var(--ink-muted)", fontWeight: 300, marginTop: "0.15rem" }}>
                  Off by default. When a work email can&apos;t be found, look up a
                  personal email from LinkedIn (uses extra credits — good for estate
                  managers and private clients).
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* ── Section: Messaging ───────────────────────────────────── */}
        <div className="mb-16">
          <div
            className="mb-8 flex items-center gap-4"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: "0.85rem",
                fontStyle: "italic",
                color: "var(--wsg-muted)",
                paddingBottom: "1rem",
              }}
            >
              03
            </span>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.5rem",
                fontWeight: 300,
                paddingBottom: "1rem",
              }}
            >
              Messaging
            </h2>
          </div>
          <div className="space-y-8">
            <Field label="What's the pitch?">
              <textarea
                name="value_prop"
                placeholder="What value are you offering? e.g. We find hidden savings on utility bills"
                required
                rows={3}
                style={{ ...inputStyle, resize: "vertical" as const }}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <Field label="What should they do?">
              <input
                name="cta"
                placeholder="e.g. 15-minute call to review your utility spend"
                required
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-12">
              <Field label="Tone">
                <select name="tone" defaultValue="consultative" style={selectStyle}>
                  <option value="luxury_formal">Luxury Formal</option>
                  <option value="consultative">Consultative</option>
                  <option value="direct">Direct</option>
                </select>
              </Field>
              <Field label="Sequence Length">
                <select name="sequence_length" defaultValue="5" style={selectStyle}>
                  <option value="3">3 emails</option>
                  <option value="5">5 emails</option>
                  <option value="7">7 emails</option>
                </select>
              </Field>
            </div>
            <Field label="Instantly Campaign ID">
              <input
                name="instantly_campaign_id"
                placeholder="Paste from Instantly"
                required
                style={inputStyle}
                onFocus={(e) =>
                  (e.target.style.borderBottomColor = "var(--wsg-camel)")
                }
                onBlur={(e) =>
                  (e.target.style.borderBottomColor = "var(--line-strong)")
                }
              />
            </Field>
          </div>
        </div>

        {/* ── Submit ───────────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "2.5rem" }}>
          <button
            type="submit"
            className="wsg-btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Campaign & Generate Query"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewCampaignPage() {
  // useSearchParams() must sit under a Suspense boundary or the production
  // build bails out of static rendering for the whole route.
  return (
    <Suspense fallback={null}>
      <NewCampaignForm />
    </Suspense>
  )
}
