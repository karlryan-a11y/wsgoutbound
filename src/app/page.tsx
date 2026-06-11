import Link from "next/link"
import { supabaseServer } from "@/lib/supabase/server"
import type { Campaign } from "@/types"
import { NLInput } from "@/components/campaign/nl-input"
import { StatusPill } from "@/components/ui/status-pill"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const db = supabaseServer()
  const { data: campaigns } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  const hasCampaigns = campaigns && campaigns.length > 0
  const list = (campaigns as Campaign[]) ?? []

  return (
    <div
      className="mx-auto w-full max-w-[1400px]"
      style={{ padding: "clamp(2.5rem, 6vw, 5rem) clamp(1.25rem, 5vw, 6rem)" }}
    >
      {/* ── NL front door — blush accent block ───────────────────────── */}
      <div
        className="accent-block mb-20"
        style={{ padding: "clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 4vw, 3.5rem)" }}
      >
        <p className="eyebrow-num mb-5">
          <b>01</b> New Campaign
        </p>
        <h1
          className="mb-5"
          style={{ fontSize: "clamp(2.1rem, 4.6vw, 3.6rem)", maxWidth: "16ch" }}
        >
          Describe your audience
        </h1>
        <p
          className="mb-9"
          style={{
            fontSize: "1.08rem",
            color: "var(--ink-soft)",
            fontWeight: 300,
            maxWidth: "52ch",
            lineHeight: 1.6,
          }}
        >
          Tell us who you want to reach. We&apos;ll find the contacts, verify
          their emails, and prepare a personalized sequence.
        </p>
        <NLInput />
      </div>

      {/* ── Campaign list or teaching empty state ────────────────────── */}
      {!hasCampaigns ? (
        <div>
          <p className="eyebrow-num mb-8">
            <b>—</b> How it works
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Describe your audience",
                desc: "Type who you're targeting — titles, locations, industries. We turn it into a precise search.",
                cls: "panel-blush-faint",
              },
              {
                num: "02",
                title: "We find & verify",
                desc: "Claude queries 130M+ contacts, you review the list, then we verify the work emails.",
                cls: "panel-cream",
              },
              {
                num: "03",
                title: "Push to Instantly",
                desc: "Personalized sequences land in your Instantly campaign, ready to send.",
                cls: "panel-blush",
              },
            ].map((step) => (
              <div
                key={step.num}
                className={step.cls}
                style={{
                  padding: "2.5rem 2rem",
                  borderTop: "2px solid var(--wsg-camel)",
                }}
              >
                <span className="index-num">{step.num}</span>
                <h3
                  className="mt-4 mb-3"
                  style={{ fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 300 }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.92rem",
                    color: "var(--ink-soft)",
                    fontWeight: 300,
                    lineHeight: 1.65,
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
          <div className="mb-8 flex items-end justify-between">
            <p className="eyebrow-num">
              <b>02</b> Recent Campaigns
            </p>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontWeight: 300 }}>
              {list.length} {list.length === 1 ? "campaign" : "campaigns"}
            </span>
          </div>
          <hr className="rule-camel mb-2" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {list.map((campaign, i) => (
              <Link key={campaign.id} href={`/c/${campaign.id}`}>
                <div
                  className="card-lift group flex h-full flex-col justify-between"
                  style={{
                    padding: "1.75rem 1.75rem 1.5rem",
                    borderTop: "2px solid var(--wsg-camel)",
                  }}
                >
                  <div>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className="index-num mt-1.5">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3
                          className="transition-colors duration-300 group-hover:text-[#BE7B44]"
                          style={{
                            fontFamily: "var(--serif)",
                            fontSize: "1.45rem",
                            fontWeight: 300,
                            lineHeight: 1.25,
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {campaign.name}
                        </h3>
                      </div>
                      <StatusPill status={campaign.status} />
                    </div>
                    <p
                      style={{
                        fontSize: "0.92rem",
                        color: "var(--ink-soft)",
                        fontWeight: 300,
                        lineHeight: 1.55,
                        paddingLeft: "2.1rem",
                      }}
                    >
                      {campaign.brief?.persona || "No persona defined"}
                    </p>
                  </div>

                  <div
                    className="mt-6 flex items-end justify-between"
                    style={{ paddingLeft: "2.1rem" }}
                  >
                    <div className="flex items-end gap-8">
                      {campaign.candidate_count != null && (
                        <div>
                          <p className="stat-num">
                            {campaign.candidate_count.toLocaleString()}
                          </p>
                          <p className="eyebrow !text-[0.58rem] mt-1.5">Contacts</p>
                        </div>
                      )}
                      {campaign.valid_count != null && (
                        <div>
                          <p className="stat-num stat-num--camel">
                            {campaign.valid_count.toLocaleString()}
                          </p>
                          <p className="eyebrow !text-[0.58rem] mt-1.5">Verified</p>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                      {new Date(campaign.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
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
