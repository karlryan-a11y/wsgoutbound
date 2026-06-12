"use client"

import { useEffect, useState } from "react"
import type { Campaign } from "@/types"
import type { StageKey } from "./pipeline-stepper"
import { EmailStatusPill } from "@/components/ui/status-pill"

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow-num mb-5 block">
      <b>—</b> {children}
    </span>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div style={{ padding: "1rem 0", borderBottom: "1px solid var(--line)" }}>
      <p className="eyebrow !text-[0.58rem] mb-1.5">{label}</p>
      <p style={{ fontSize: "0.98rem", color: "var(--ink)", fontWeight: 300 }}>
        {Array.isArray(value) ? value.join(", ") : value}
      </p>
    </div>
  )
}

/* Read-only view of a completed stage, shown when you click back in the stepper. */
export function StageSummary({
  stageKey,
  campaign,
}: {
  stageKey: StageKey
  campaign: Campaign
}) {
  if (stageKey === "ask") {
    const b = campaign.brief
    return (
      <div>
        <Eyebrow>Brief</Eyebrow>
        <div style={{ borderTop: "1px solid var(--line)" }}>
          <Field label="Who you're reaching" value={b.persona} />
          <Field label="Job titles to target" value={b.titles_include} />
          <Field label="Job titles to skip" value={b.titles_exclude} />
          <Field label="Locations" value={b.geographies} />
          <Field label="Industries" value={b.industries} />
          <Field label="Gender" value={b.gender && b.gender !== "any" ? b.gender : null} />
          <Field label="The pitch" value={b.value_prop} />
          <Field label="Call to action" value={b.cta} />
          <Field label="Tone" value={b.tone} />
          <Field label="Sequence length" value={`${b.sequence_length} emails`} />
        </div>
      </div>
    )
  }

  if (stageKey === "query" || stageKey === "review") {
    const v = campaign.sql_versions?.[campaign.sql_versions.length - 1]
    const sample = (v?.sample ?? []) as Record<string, unknown>[]
    const keys = sample.length > 0 ? Object.keys(sample[0]).slice(0, 5) : []
    return (
      <div>
        <Eyebrow>Audience</Eyebrow>
        <p className="mb-6" style={{ fontSize: "1rem", color: "var(--ink-soft)", fontWeight: 300 }}>
          <strong style={{ color: "var(--wsg-camel)", fontWeight: 600 }}>
            {(v?.row_count ?? campaign.candidate_count ?? 0).toLocaleString()}
          </strong>{" "}
          contacts matched in BigQuery.
        </p>
        {(v?.criteria?.included?.length ?? 0) > 0 && (
          <div className="mb-8">
            <p className="eyebrow !text-[0.58rem] mb-2">Included</p>
            <ul style={{ fontSize: "0.92rem", color: "var(--ink-soft)", fontWeight: 300, lineHeight: 1.8 }}>
              {v!.criteria!.included.map((c, i) => (
                <li key={i}>· {c}</li>
              ))}
            </ul>
          </div>
        )}
        {sample.length > 0 && (
          <div style={{ border: "1px solid var(--line)", maxHeight: "400px", overflow: "auto" }}>
            <table className="w-full" style={{ fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {keys.map((k) => (
                    <th key={k} className="eyebrow text-left" style={{ padding: "0.7rem 1rem", fontSize: "0.56rem", background: "var(--blush-faint)", position: "sticky", top: 0 }}>
                      {k.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.slice(0, 50).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    {keys.map((k) => (
                      <td key={k} style={{ padding: "0.55rem 1rem", color: "var(--ink-soft)", fontWeight: 300 }}>
                        {String(row[k] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (stageKey === "enrich") {
    return <VerifySummary campaignId={campaign.id} />
  }

  if (stageKey === "copy") {
    const steps = campaign.master_copy?.steps ?? []
    return (
      <div>
        <Eyebrow>Email Sequence</Eyebrow>
        {steps.length === 0 ? (
          <p style={{ color: "var(--ink-muted)", fontWeight: 300 }}>No sequence generated yet.</p>
        ) : (
          <div style={{ borderTop: "1px solid var(--line)" }}>
            {steps.map((s, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--line)", padding: "1.75rem 0" }}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="index-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="eyebrow !text-[0.58rem]">
                    {s.delay_days === 0 ? "Send immediately" : `+${s.delay_days} days`}
                  </span>
                </div>
                <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.2rem", fontWeight: 300, marginBottom: "0.75rem" }}>
                  {s.subject}
                </h3>
                <pre style={{ fontFamily: "var(--sans)", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.7, color: "var(--ink-soft)", whiteSpace: "pre-wrap", maxWidth: "60ch" }}>
                  {s.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // push
  return (
    <div>
      <Eyebrow>Sent to Instantly</Eyebrow>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        <Field label="Status" value={campaign.status === "completed" ? "Complete — live in Instantly" : campaign.status} />
        <Field label="Verified contacts" value={(campaign.valid_count ?? 0).toLocaleString()} />
        <Field label="Instantly campaign" value={campaign.instantly_campaign_id || campaign.brief.instantly_campaign_id} />
        <Field label="Completed" value={campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : null} />
      </div>
    </div>
  )
}

type RecentLead = { id: string; name: string; title: string; company: string; email: string; email_status: string | null }

function VerifySummary({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<{
    enriched_count: number
    valid_count: number
    total_leads: number
    recent_leads: RecentLead[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/campaign/${campaignId}/progress`, { cache: "no-store" })
        if (res.ok && !cancelled) setData(await res.json())
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [campaignId])

  if (!data) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div className="wsg-spinner" />
        <span style={{ color: "var(--ink-muted)", fontWeight: 300 }}>Loading results…</span>
      </div>
    )
  }

  const submitted = data.total_leads
  const withEmail = data.recent_leads.filter((l) => l.email).length
  const stats = [
    { num: submitted, label: "Submitted", cls: "" },
    { num: data.enriched_count, label: "Emails found", cls: "stat-num--camel" },
    { num: data.valid_count, label: "Verified", cls: "stat-num--green" },
  ]

  return (
    <div>
      <Eyebrow>Verification Results</Eyebrow>
      <div className="mb-10 grid grid-cols-3 gap-0" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ padding: "1.75rem 1.5rem", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
            <p className={`stat-num ${s.cls}`}>{s.num.toLocaleString()}</p>
            <p className="eyebrow !text-[0.58rem] mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {data.enriched_count === 0 && submitted > 0 && (
        <div className="accent-block mb-8" style={{ padding: "1.25rem 1.5rem" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", fontWeight: 300, lineHeight: 1.6 }}>
            None of the {submitted} contacts returned a verified email. This is common
            at large firms (e.g. Deloitte) that block email verification — a mid-market
            audience typically hits 40–60%.
          </p>
        </div>
      )}

      {data.recent_leads.length > 0 && (
        <div style={{ border: "1px solid var(--line)", maxHeight: "440px", overflow: "auto" }}>
          <table className="w-full" style={{ fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Name", "Company", "Email", "Status"].map((h) => (
                  <th key={h} className="eyebrow text-left" style={{ padding: "0.7rem 1rem", fontSize: "0.56rem", background: "var(--blush-faint)", position: "sticky", top: 0 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent_leads.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.55rem 1rem", color: "var(--ink)", fontWeight: 400 }}>{l.name}</td>
                  <td style={{ padding: "0.55rem 1rem", color: "var(--ink-soft)", fontWeight: 300 }}>{l.company}</td>
                  <td style={{ padding: "0.55rem 1rem", color: "var(--ink-soft)", fontWeight: 300 }}>{l.email || "—"}</td>
                  <td style={{ padding: "0.45rem 1rem" }}><EmailStatusPill status={l.email_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {withEmail === 0 && data.recent_leads.length === 0 && (
        <p style={{ fontSize: "0.9rem", color: "var(--ink-muted)", fontWeight: 300 }}>
          No verified contacts to show yet.
        </p>
      )}
    </div>
  )
}
