import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import type { Campaign, CampaignStatus } from "@/types"
import { NLInput } from "@/components/campaign/nl-input"

export const dynamic = "force-dynamic"

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Starting",
  awaiting_sql_review: "Review Audience",
  querying: "Finding Contacts",
  awaiting_volume: "Choose Volume",
  enriching: "Verifying Emails",
  awaiting_copy_review: "Review Sequence",
  pushing: "Sending to Instantly",
  completed: "Complete",
  failed: "Failed",
  cancelled: "Stopped",
}

const statusAccent: Record<CampaignStatus, string> = {
  draft: "rgba(0, 0, 0,0.3)",
  awaiting_sql_review: "#BE7B44",
  querying: "#7FB5CB",
  awaiting_volume: "#BE7B44",
  enriching: "#7FB5CB",
  awaiting_copy_review: "#BE7B44",
  pushing: "#7FB5CB",
  completed: "#2D500D",
  failed: "#C30319",
  cancelled: "rgba(0, 0, 0,0.2)",
}

export default async function DashboardPage() {
  const db = supabaseServer()
  const { data: campaigns } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  const hasCampaigns = campaigns && campaigns.length > 0

  return (
    <div className="mx-auto w-full max-w-[1400px]"
      style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 6rem)" }}
    >
      {/* NL front door */}
      <div className="mb-20">
        <span className="eyebrow mb-4 block">New Campaign</span>
        <h1 className="mb-6" style={{ fontSize: "clamp(2rem, 4.2vw, 3.2rem)" }}>
          Describe your audience
        </h1>
        <p
          className="mb-10"
          style={{
            fontSize: "1.05rem",
            color: "rgba(0, 0, 0,0.45)",
            fontWeight: 300,
            maxWidth: "52ch",
          }}
        >
          Tell us who you want to reach. We&apos;ll find contacts, verify emails, and prepare your sequence.
        </p>
        <NLInput />
      </div>

      {/* Campaign list or teaching empty state */}
      {!hasCampaigns ? (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "4rem" }}>
          <div className="grid grid-cols-1 gap-0 md:grid-cols-3" style={{ borderBottom: "1px solid var(--line)" }}>
            {[
              { num: "01", title: "Describe your audience", desc: "Type who you're targeting — titles, locations, industries. We parse it into a search." },
              { num: "02", title: "We find & verify", desc: "Claude queries 130M+ contacts, you review the list, then we verify work emails." },
              { num: "03", title: "Push to Instantly", desc: "Personalized sequences land in your Instantly campaign, ready to send." },
            ].map((step, i) => (
              <div
                key={step.num}
                style={{
                  padding: "2.5rem 2rem",
                  borderRight: i < 2 ? "1px solid var(--line)" : "none",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "0.85rem",
                    fontStyle: "italic",
                    color: "var(--wsg-muted)",
                  }}
                >
                  {step.num}
                </span>
                <h3
                  className="mt-4 mb-3"
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "1.25rem",
                    fontWeight: 300,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "rgba(0, 0, 0,0.4)",
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-8 flex items-end justify-between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "1rem" }}>
            <span className="eyebrow" style={{ color: "rgba(0, 0, 0,0.4)" }}>Recent Campaigns</span>
          </div>
          <div>
            {(campaigns as Campaign[]).map((campaign, i) => (
              <Link key={campaign.id} href={`/c/${campaign.id}`}>
                <div
                  className="group flex items-center justify-between transition-all duration-300"
                  style={{
                    padding: "2rem 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div className="flex items-start gap-8">
                    <span
                      className="mt-1 shrink-0"
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: "0.85rem",
                        fontStyle: "italic",
                        color: "var(--wsg-muted)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        className="transition-colors duration-300 group-hover:text-[#BE7B44]"
                        style={{
                          fontFamily: "var(--serif)",
                          fontSize: "1.5rem",
                          fontWeight: 300,
                          letterSpacing: "-0.005em",
                          lineHeight: 1.3,
                        }}
                      >
                        {campaign.name}
                      </h3>
                      <p
                        className="mt-1"
                        style={{
                          fontSize: "0.92rem",
                          color: "rgba(0, 0, 0,0.45)",
                          fontWeight: 300,
                        }}
                      >
                        {campaign.brief?.persona || "No persona defined"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-10">
                    {campaign.candidate_count != null && (
                      <div className="hidden text-right md:block">
                        <p style={{ fontSize: "1.25rem", fontWeight: 300 }}>
                          {campaign.candidate_count.toLocaleString()}
                        </p>
                        <p className="eyebrow !text-[0.6rem]">Contacts</p>
                      </div>
                    )}
                    {campaign.valid_count != null && (
                      <div className="hidden text-right md:block">
                        <p style={{ fontSize: "1.25rem", fontWeight: 300 }}>
                          {campaign.valid_count.toLocaleString()}
                        </p>
                        <p className="eyebrow !text-[0.6rem]">Verified</p>
                      </div>
                    )}
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: "0.72rem",
                          fontWeight: 500,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase" as const,
                          color: statusAccent[campaign.status],
                        }}
                      >
                        {statusLabels[campaign.status]}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "rgba(0, 0, 0,0.25)",
                        }}
                      >
                        {new Date(campaign.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
