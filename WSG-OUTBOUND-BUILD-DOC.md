# WSG Outbound — Complete Build Document

**Last updated:** 2026-06-10
**Repo:** https://github.com/karlryan-a11y/wsgoutbound
**Local path:** `/Users/karlwatson/Downloads/wsgoutbound`
**Live URL:** https://wsgoutbound.vercel.app
**Vercel team:** wsgautomations-projects
**Supabase project:** oujiouxbtckkxwfohoyy

---

## What This App Does

Internal outbound email campaign tool for Watson Style Group. End-to-end flow:

1. Karl writes a campaign brief (persona, titles, geo, value prop, CTA, tone)
2. Claude generates BigQuery SQL against a 400M+ contact warehouse (apollo.people + apollo.linkedin_us)
3. Karl reviews SQL results, refines in a human-in-loop with Claude
4. Karl picks how many leads to enrich (volume selection)
5. LeadMagic finds and validates work emails (5 RPS, 1 credit per lookup)
6. Claude generates a master email sequence + per-lead personalization
7. Karl reviews and approves copy
8. App pushes leads + personalization tokens to Instantly.ai
9. Karl configures sending and launches in Instantly UI

Single-tenant for WSG. No multi-tenant abstractions.

---

## UX Playbook — Applied to WSG Outbound

### The spine

**Ask → Query → Review → Enrich → Copy → Push**

Every screen serves exactly one stage of this spine. The pipeline is always visible as a stepper across the top of the campaign detail page. The user always knows where they are, what's next, and what's behind them.

### What we borrow and how

| Playbook principle | How it applies to WSG Outbound | What to build |
|---|---|---|
| **Natural-language front door** | Dashboard gets an NL input: "Find estate managers in California for utility analysis" → Claude parses into brief fields → user reviews/edits → submit. Example chips for common personas. | Rework `/` dashboard + `/new` form |
| **Pipeline visible and live** | Campaign detail page shows a horizontal stepper: Ask → Query → Review → Enrich → Copy → Push. Current stage highlighted in camel. Completed stages show green check. | New `PipelineStepper` component on `/c/[id]` |
| **The grid is the centerpiece** | During enrichment, the live lead table IS the page — not a secondary section below stats. Rows appear in real time. Each column fills as data arrives (name first, then company, then email, then status chip). | Rework `LiveProgress` — grid-first layout |
| **Show the "why" inline** | SQL review already shows criteria in plain English ✅. During enrichment: each lead row shows a status chip (Valid, Risky, Invalid, No Email) with a reason tooltip. In the SQL review excluded tab: show WHY each row was excluded. | Status chips + tooltips in lead grid |
| **Needs-Review triage** | Leads with risky/catch_all email status get flagged into a "Needs Review" tab on the enrichment page. One-click approve or skip per lead. | Tab on enrichment/results view |
| **Cost honesty** | Volume picker shows "Estimated cost: ~X LeadMagic credits" below the slider. During enrichment: live credit counter ("12 credits used"). Pre-run warning if credits are low. | Update `VolumePicker` + `LiveProgress` |
| **Approve-as-you-go gates** | Already have SQL review → volume → copy review ✅. Add: "Test 5 leads" button on volume picker — runs a mini enrichment to verify quality before committing to full run. | Test-batch feature on volume picker |
| **Zero-training, plain language** | No "BQ", no "Inngest", no "enrichment" in user-facing UI. Use: "Find contacts", "Verify emails", "Write sequence", "Push to Instantly". | Label audit across all components |
| **Progressive disclosure** | Raw SQL behind "Show query" toggle in SQL review (already hidden ✅). API responses behind "Show details" in settings. Advanced brief fields (company size, industries) behind "More filters" toggle. | Toggles where needed |
| **Teaching empty states** | Empty dashboard: show a 3-step visual ("1. Describe your audience → 2. We find & verify → 3. Push to Instantly") instead of "No campaigns yet". Empty knowledge: "Add your first brand doc to improve email quality." | Rework empty states |
| **Polish signals quality** | WSG brand: Schnyder M serif, Neue Haas sans, camel `#BE7B44` accent, sharp edges (NO border-radius — WSG aesthetic), dark mode, generous whitespace, subtle transitions. | Already done ✅ |

### What we DON'T borrow

- **Spreadsheet-as-primary-surface** — We're campaign-based, not a spreadsheet tool. The grid is one stage, not the whole app.
- **Waterfall enrichment visualization** — We only use LeadMagic. No multi-provider waterfall to show.
- **Rounded cards** — WSG brand uses sharp edges. Playbook says "rounded cards" but our aesthetic is angular editorial luxury.
- **Per-seat pricing concerns** — Single user.
- **Feature density optimization** — There's only one user. We optimize for speed and confidence, not discoverability.

---

## Stack

| Layer | Tech | Version |
|---|---|---|
| Frontend | Next.js App Router | 16.2.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | 4.8.0 |
| Auth | Clerk | 7.4.0 |
| Database | Supabase Postgres + pgvector | — |
| Orchestration | Inngest | 4.4.0 |
| LLM | Anthropic Claude (claude-sonnet-4-6) | SDK 0.98.0 |
| Embeddings | Voyage AI (voyage-3, 1024 dims) | — |
| Data source | BigQuery | 8.3.1 |
| Enrichment | LeadMagic (email-finder) | — |
| Sending | Instantly.ai v2 API | — |
| Hosting | Vercel | — |

---

## Brand System

- **Serif:** Schnyder M (via `var(--serif)`)
- **Sans:** Neue Haas Grotesk (via `var(--sans)`)
- **Accent:** Camel `#BE7B44` (via `var(--wsg-camel)`)
- **Background:** Black `#0A0A0A` (via `var(--wsg-black)`)
- **Valid/success:** `#2D500D`
- **Warning/risky:** `#BE7B44`
- **Error/invalid:** `#C30319`
- **No border-radius anywhere** — WSG luxury editorial aesthetic
- **Dark mode only**
- **Logo:** `public/logos/W_Icon_White.svg` rendered at 108px in header

---

## Database Schema (Supabase)

### Tables

| Table | Purpose | Status |
|---|---|---|
| `campaigns` | Campaign state, brief, SQL versions, master copy, counts | Active — read/write by pipeline |
| `leads` | Enriched leads per campaign (source_data, email, status, personalization) | Active — read/write by pipeline |
| `knowledge` | RAG knowledge base (docs, email samples, case studies) with vector embeddings | Schema exists, RAG retrieval works, **no UI to manage** |
| `instructions` | Always-apply rules by category (filter, tone, vocabulary, suppression) | Schema exists, retrieval works, **no UI to manage** |
| `outcomes` | Campaign results (sent, opened, replied counts, what worked/didn't) | Schema exists, **completely unused** |
| `suppression` | Email/domain suppression list | Schema exists, **never queried during enrichment** |
| `debug_log` | LLM prompt/response audit trail, enrichment failure logging | Active — write by pipeline |
| `enrichment_log` | Per-lead enrichment API call log | Schema exists, **unused** (debug_log used instead) |

### RPC Functions

- `match_knowledge(query_embedding, match_count, filter_type)` — Vector cosine similarity search on knowledge table

### Migrations

- `sql/0001_init.sql` — All tables, indexes, RLS policies, match_knowledge function
- `sql/0002_enrichment.sql` — Additional leads columns + enrichment_log table

---

## File Map

### Pages (App Router)

| Route | File | What it does |
|---|---|---|
| `/` | `src/app/page.tsx` | Dashboard — lists campaigns with status badges |
| `/new` | `src/app/new/page.tsx` | Brief form (basics, targeting, messaging) |
| `/c/[id]` | `src/app/c/[id]/page.tsx` | Campaign detail — renders stage component based on status |
| `/knowledge` | `src/app/knowledge/page.tsx` | **PLACEHOLDER** |
| `/instructions` | `src/app/instructions/page.tsx` | **PLACEHOLDER** |
| `/settings` | `src/app/settings/page.tsx` | **PLACEHOLDER** |

### API Routes

| Route | File | Auth | Purpose |
|---|---|---|---|
| `POST /api/inngest` | `src/app/api/inngest/route.ts` | Public | Inngest webhook |
| `GET /api/campaign/[id]/progress` | `src/app/api/campaign/[id]/progress/route.ts` | Public | Polling: status, counts, failure_reason, recent leads |
| `POST /api/campaign/[id]/cancel` | `src/app/api/campaign/[id]/cancel/route.ts` | Public | Cancel enrichment |
| `POST /api/admin/retrigger` | `src/app/api/admin/retrigger/route.ts` | Public | Admin retrigger |

### Server Actions

| File | Actions |
|---|---|
| `src/app/new/actions.ts` | `createCampaign(formData)` |
| `src/app/c/[id]/actions.ts` | `submitSqlReview`, `submitVolumeSelection`, `submitCopyReview` |

### Campaign Stage Components

| Component | File | When shown |
|---|---|---|
| `SqlReview` | `src/components/campaign/sql-review.tsx` | `awaiting_sql_review` |
| `VolumePicker` | `src/components/campaign/volume-picker.tsx` | `awaiting_volume` |
| `LiveProgress` | `src/components/campaign/live-progress.tsx` | `draft/querying/enriching/pushing/failed/cancelled` |
| `CopyReview` | `src/components/campaign/copy-review.tsx` | `awaiting_copy_review` |
| `PushStatus` | `src/components/campaign/push-status.tsx` | `completed` |

### Library Code

| File | Purpose |
|---|---|
| `src/lib/anthropic/client.ts` | Anthropic SDK wrapper |
| `src/lib/anthropic/generate-sql.ts` | SQL gen with RAG + instructions |
| `src/lib/anthropic/generate-copy.ts` | Email sequence gen + per-lead personalization |
| `src/lib/bigquery/client.ts` | BQ client (authorized_user workaround) |
| `src/lib/bigquery/schema.ts` | BQ schema reference (people 93M, linkedin_us 39.9M, orgs 6M) |
| `src/lib/leadmagic/client.ts` | Email finder with rate limiting + error handling |
| `src/lib/instantly/client.ts` | Instantly v2 bulk push |
| `src/lib/rag/retrieve.ts` | Voyage embed → Supabase vector search |
| `src/lib/instructions.ts` | Active instruction retrieval by category |
| `src/lib/voyage/embed.ts` | Voyage AI embedding (voyage-3, 1024 dims) |
| `src/lib/inngest/client.ts` | Inngest client init |

### Inngest

| Function | Trigger | What it does |
|---|---|---|
| `run-campaign` | `campaign/submitted` | Full orchestration: SQL → BQ → review → enrich → copy → personalization → push |

| Event | Fired by | Consumed by |
|---|---|---|
| `campaign/submitted` | `createCampaign` action | `run-campaign` |
| `campaign/sql-reviewed` | `submitSqlReview` action | `step.waitForEvent` |
| `campaign/volume-set` | `submitVolumeSelection` action | `step.waitForEvent` |
| `campaign/copy-reviewed` | `submitCopyReview` action | `step.waitForEvent` |

---

## Uncommitted Code Warning

**18 modified + 5 new files deployed to Vercel production but NOT in git.** Last commit: `718d3dd` from 2026-05-22. All work since (enrichment pipeline, error handling, live progress, polling fixes, brand refinements) is local only.

---

## Environment Variables

All set on Vercel production:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
VOYAGE_API_KEY
VOYAGE_MODEL
LEADMAGIC_API_KEY
LEADMAGIC_BASE_URL
INSTANTLY_API_KEY
INSTANTLY_BASE_URL
GCP_PROJECT_ID
GCP_BIGQUERY_DATASET
GCP_BIGQUERY_LOCATION
GCP_SERVICE_ACCOUNT_JSON
RATE_LIMIT_LEADMAGIC_RPS
RATE_LIMIT_ANTHROPIC_RPS
VERCEL_AUTOMATION_BYPASS_SECRET
```

**Note:** `GCP_SERVICE_ACCOUNT_JSON` contains `authorized_user` credentials (not a service account) due to org policy blocking key creation. These expire.

---

## Known Issues

1. **All production code uncommitted** — highest risk
2. **GCP credentials fragile** — authorized_user JSON expires
3. **LeadMagic credits near zero** — next run will 402
4. **`enrichment_log` table unused** — audit trail goes to `debug_log` instead
5. **No tests** — zero test files
6. **`httpx` in package.json** — unused Python package name, harmless
7. **953 stale leads** on test campaign `99b504f7`
8. **`reference_knowledge_ids` defined but never used**

---

## What to Build Next — Playbook Applied

### Action 0: Commit Everything

Before anything else. 3 weeks of production code is uncommitted.

```bash
cd /Users/karlwatson/Downloads/wsgoutbound
git add -A
git commit -m "feat: complete enrichment pipeline, live progress UI, error handling, brand system

- Full Inngest orchestration: SQL gen → BQ → review → enrich → copy → push
- LiveProgress component with stall detection, stop button, live lead table
- Progress API with failure_reason, cancel endpoint
- LeadMagicApiError with credit/auth/rate detection + consecutive failure stop
- SQL gen: max_tokens 8192, markdown stripping, excluded-sample queries
- BigQuery authorized_user credential workaround
- Instantly v2 bulk push with personalization variables
- Polling fixes for all review stages
- WSG brand: Schnyder M + Neue Haas, camel accent, 108px logo

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Action 1: Pipeline Stepper + Campaign Detail Polish

**Playbook principle:** Make the pipeline visible. The user always knows where they are.

Add a horizontal pipeline stepper to the campaign detail page. Shows all stages with the current one highlighted. Completed stages show a check.

**What to build:**

1. Create `src/components/campaign/pipeline-stepper.tsx`:
   - Horizontal stepper with 6 stages: Ask → Query → Review → Enrich → Copy → Push
   - Map campaign statuses to stages:
     - `draft` / `querying` → "Query" active
     - `awaiting_sql_review` → "Review" active
     - `awaiting_volume` / `enriching` → "Enrich" active
     - `awaiting_copy_review` → "Copy" active
     - `pushing` → "Push" active
     - `completed` → all done
     - `failed` / `cancelled` → show which stage failed
   - Style: WSG brand. Thin horizontal line connecting stages. Current stage in camel `#BE7B44`. Completed stages in `#2D500D` with check. Future stages in `rgba(255,255,255,0.2)`. Schnyder M labels.
   - No border-radius on anything.

2. Update `src/app/c/[id]/page.tsx`:
   - Add `<PipelineStepper status={c.status} />` below the campaign header, above the divider
   - Add plain-language stage descriptions below the stepper:
     - "Finding contacts matching your audience" (querying)
     - "Review the contacts we found" (awaiting_sql_review)
     - "Verifying email addresses" (enriching)
     - "Review your email sequence" (awaiting_copy_review)
     - "Sending to Instantly" (pushing)

**Files to read first:** `src/app/c/[id]/page.tsx`, `src/app/globals.css` (for CSS vars), `src/types/index.ts` (for CampaignStatus)

---

### Action 2: Natural-Language Front Door + Example Chips

**Playbook principle:** NL front door with example chips. Zero training.

Replace the plain "New Campaign" button with an NL input on the dashboard. User types a natural-language description, Claude parses it into brief fields, user reviews and edits before submitting.

**What to build:**

1. Update `src/app/page.tsx` (dashboard):
   - Add a prominent NL input area above the campaign list: "Describe your next campaign..."
   - Below the input: 3-4 example chips that pre-fill the input when clicked:
     - "Estate managers in California"
     - "CFOs at mid-market companies in NYC"
     - "Facilities directors at manufacturers in Texas"
     - "VPs of Operations in the Southeast"
   - On submit: POST to a new server action that sends the NL text to Claude for parsing
   - Teaching empty state: when no campaigns exist, show a 3-step visual instead of "No campaigns yet":
     1. "Describe your audience" (icon: chat bubble)
     2. "We find & verify contacts" (icon: search)
     3. "Push to Instantly" (icon: send)

2. Create `src/app/new/parse-brief.ts` (server action):
   - Takes NL text, calls Claude to parse into CampaignBrief fields
   - Returns structured brief JSON
   - Uses claude-haiku-4-5-20251001 for speed (simple parsing task)
   - System prompt: "Extract campaign targeting from this description. Output JSON: { name, persona, titles_include[], titles_exclude[], geographies[], industries[], value_prop, cta }"

3. Update `src/app/new/page.tsx`:
   - Accept pre-filled brief from URL params (from NL parse)
   - Pre-populate form fields if brief data exists in search params
   - Keep the structured form as the review/edit step
   - Add a "Parsed from your description" banner at top when pre-filled
   - All form fields remain editable

**User-facing language (no jargon):**
- "Describe your next campaign" not "Create campaign brief"
- "Who are you reaching?" not "Target persona"
- "What titles?" not "titles_include"
- "Where?" not "Geographies"
- "What's the pitch?" not "Value proposition"

**Files to read first:** `src/app/page.tsx`, `src/app/new/page.tsx`, `src/app/new/actions.ts`, `src/lib/anthropic/client.ts`, `src/types/index.ts`

---

### Action 3: Cost Honesty + Live Credit Meter

**Playbook principle:** Estimate before, live meter during. No surprise spend.

Add credit cost estimates to the volume picker and a live credit counter during enrichment.

**What to build:**

1. Update `src/components/campaign/volume-picker.tsx`:
   - Below the slider, add cost estimate section:
     - "Estimated cost: ~{enrichCount} LeadMagic credits" (1 credit per lookup)
     - "Not all lookups find an email — typical hit rate is 40-60%"
     - Show expected valid leads: "Expected valid emails: ~{Math.round(enrichCount * 0.5)}"
   - Add "Test 5 leads first" button (secondary action):
     - Runs enrichment on just 5 leads
     - Shows results in a mini-grid inline
     - User sees quality before committing to full run
     - On approve: proceeds with full volume
   - Style: cost info in a bordered section below the slider. Camel accent on the credit number.

2. Update progress API `src/app/api/campaign/[id]/progress/route.ts`:
   - Add `credits_used` field — sum credits from debug_log entries for this campaign where step = 'leadmagic_enrich'
   - Or: track credits_used in campaign table directly (simpler)

3. Update `src/components/campaign/live-progress.tsx`:
   - Add live credit counter in the stats row: "Credits: {credits_used}"
   - Show alongside enriched/valid/personalized counts

4. For the test-batch feature, update `src/app/c/[id]/actions.ts`:
   - New action: `submitTestBatch(campaignId)` — fires a `campaign/test-batch` event
   - Update `src/inngest/functions/run-campaign.ts` to handle test batch: enrich only 5 leads, then pause at `awaiting_volume` again with test results visible

**Files to read first:** `src/components/campaign/volume-picker.tsx`, `src/components/campaign/live-progress.tsx`, `src/app/api/campaign/[id]/progress/route.ts`, `src/inngest/functions/run-campaign.ts`

---

### Action 4: Grid-First Enrichment View + Needs-Review Triage

**Playbook principle:** The grid is the centerpiece. Show the "why" inline. Flag into triage.

Make the enrichment live lead table the primary UI element. Add status chips with reasons. Add a Needs Review tab for questionable leads.

**What to build:**

1. Rework `src/components/campaign/live-progress.tsx`:
   - **Layout change:** Grid first, stats second. The lead table should be above the fold, the stats bar becomes a compact header row above the grid.
   - **Status chips per lead:** Replace the plain text email_status with styled chips:
     - Valid → green chip `#2D500D`
     - Risky → amber chip `#BE7B44`
     - Catch All → amber chip `#BE7B44`
     - Invalid → red chip `#C30319`
     - No Email → gray chip
   - **Column-by-column feel:** Leads appear with name/title/company immediately. Email column shows a spinner until enrichment completes, then fills in with the result.

2. Add tab switcher on the enrichment view:
   - "All Leads" tab — shows everything (current behavior)
   - "Needs Review" tab — shows only leads with email_status = 'risky' or 'catch_all'
   - Tab counts update in real time
   - Needs Review leads get a one-click "Approve" (keep) or "Skip" (remove from campaign) button per row

3. Update progress API to support filtering:
   - Accept optional `?status=risky,catch_all` query param to filter recent_leads

4. For the "Skip" action:
   - `POST /api/campaign/[id]/leads/[leadId]/skip` — sets email to null (removes from push)
   - Or: add `skipped` boolean column to leads table

**Files to read first:** `src/components/campaign/live-progress.tsx`, `src/app/api/campaign/[id]/progress/route.ts`, `src/types/index.ts`

---

### Action 5: Knowledge Management Page

**Playbook principle:** Teaching empty states. The knowledge base makes every campaign smarter.

Build the `/knowledge` page with full CRUD. This feeds directly into SQL generation and copy generation via RAG.

**What to build:**

1. `src/app/api/knowledge/route.ts` — GET (list all, optional type filter), POST (create + embed via Voyage)
2. `src/app/api/knowledge/[id]/route.ts` — GET (single), PUT (update + re-embed), DELETE
3. Replace `src/app/knowledge/page.tsx` placeholder:
   - Teaching empty state: "Your knowledge base is empty. Add brand docs, winning emails, and case studies to improve campaign quality. Each document gets embedded and automatically referenced when generating queries and email sequences."
   - Add entry form: title, content (textarea), type dropdown (doc, note, case_study, email_sample, transcript, brand), tags (comma-separated)
   - Browse view: list entries grouped by type sections, newest first within each group
   - Each entry card: title, type badge, preview snippet (first 200 chars), date, tags
   - Click to expand/edit inline
   - Delete with confirmation
   - On create/update: call `embed()` from `src/lib/voyage/embed.ts`, store vector in `embedding` column

**User-facing language:**
- "Knowledge Base" → "Reference Library"
- "doc" → "Document"
- "case_study" → "Case Study"
- "email_sample" → "Winning Email"

**Files to read first:** `src/lib/voyage/embed.ts`, `src/lib/rag/retrieve.ts`, `src/types/index.ts`, `src/app/globals.css`

---

### Action 6: Instructions/Rules Management Page

**Playbook principle:** Boring, grouped settings. Keep config out of the main flow.

Build the `/instructions` page with full CRUD. These rules get injected into every Claude prompt automatically.

**What to build:**

1. `src/app/api/instructions/route.ts` — GET (list all, optional category filter), POST (create)
2. `src/app/api/instructions/[id]/route.ts` — PUT (update rule text, toggle active), DELETE
3. Replace `src/app/instructions/page.tsx` placeholder:
   - Grouped by category with section headers:
     - **Targeting Rules** (category: filter) — "Always applied when generating search queries"
     - **Tone Rules** (category: tone) — "Always applied when writing email sequences"
     - **Vocabulary Rules** (category: vocabulary) — "Words and phrases to use or avoid"
     - **Suppression Rules** (category: suppression) — "Domains and contacts to always exclude"
   - Each rule: text, active toggle (inline), edit button, delete button
   - Add new rule: inline form at bottom of each section (text input + submit)
   - Teaching empty state per section: e.g. "No targeting rules yet. Example: 'Never include companies under 50 employees'"
4. Update `src/lib/anthropic/generate-sql.ts` and `src/lib/anthropic/generate-copy.ts`:
   - After fetching instructions, update `last_referenced_at` on each fetched instruction

**Files to read first:** `src/lib/instructions.ts`, `src/types/index.ts`, `src/lib/anthropic/generate-sql.ts`, `src/lib/anthropic/generate-copy.ts`

---

### Action 7: Suppression + Query Both BQ Tables

Two backend improvements that don't need major UI work.

**7a: Suppression checking**

1. In `src/inngest/functions/run-campaign.ts`, before calling `enrichBatch`:
   - Query suppression table for matching emails or domains
   - Skip matched leads (don't spend LeadMagic credits)
   - Log skipped count to debug_log
2. Add suppression import to the instructions page:
   - CSV upload (emails or domains, one per line)
   - `POST /api/suppression/import` — parses CSV, inserts into suppression table
   - Browse/delete existing suppressions

**7b: Query both BQ tables**

1. Update `src/lib/anthropic/generate-sql.ts`:
   - Change system prompt to instruct Claude to query BOTH `apollo.people` and `apollo.linkedin_us`
   - Use UNION ALL with column mapping to normalize schemas
   - Deduplicate by name + company in the outer query
2. Update `src/lib/bigquery/schema.ts` usage notes

**Files to read first:** `src/inngest/functions/run-campaign.ts`, `src/lib/anthropic/generate-sql.ts`, `src/lib/bigquery/schema.ts`

---

### Action 8: Settings + Health Checks

**Playbook principle:** Boring, grouped settings.

Build the `/settings` page with integration health checks.

**What to build:**

1. `GET /api/settings/health` — pings each service:
   - Supabase: `SELECT 1`
   - Anthropic: list models endpoint
   - Voyage: test embed
   - LeadMagic: check credit balance (if API supports it)
   - Instantly: list campaigns
   - BigQuery: dry-run a simple query
2. Replace `src/app/settings/page.tsx` placeholder:
   - Integration status grid: service name + green/red indicator + last-checked time
   - "Check All" button to re-run health checks
   - Show env var names (not values) with set/missing status

**Files to read first:** `src/lib/supabase/server.ts`, `src/lib/anthropic/client.ts`, `src/lib/voyage/embed.ts`, `src/lib/leadmagic/client.ts`, `src/lib/instantly/client.ts`, `src/lib/bigquery/client.ts`

---

### Action 9: Label Audit — Plain Language Pass

**Playbook principle:** Zero-training, plain language. No internal jargon user-facing.

Audit every user-facing string in the app and replace jargon:

| Current (jargon) | Replace with |
|---|---|
| "Campaign Management" | "Campaigns" |
| "Target Persona" | "Who are you reaching?" |
| "Include Titles" | "Job titles to target" |
| "Exclude Titles" | "Job titles to skip" |
| "Geographies" | "Locations" |
| "Value Proposition" | "What's the pitch?" |
| "Call to Action" | "What should they do?" |
| "Instantly Campaign ID" | "Instantly campaign ID" (keep — it's a real product name) |
| "Enrichment Volume" | "How many to verify" |
| "Enriching" | "Verifying emails" |
| "Pushing" | "Sending to Instantly" |
| "Query Criteria" | "Who we're finding" |
| "Audience Definition" | "Your audience" |
| "Enriched Leads" | "Verified contacts" |
| "Personalized" | "Personalized" (fine) |
| "Enrichment Appears Stalled" | "Verification stopped responding" |
| "Stop Enrichment" | "Stop" |

**Files to update:** `src/app/page.tsx`, `src/app/new/page.tsx`, `src/app/c/[id]/page.tsx`, `src/components/campaign/live-progress.tsx`, `src/components/campaign/sql-review.tsx`, `src/components/campaign/volume-picker.tsx`, `src/components/campaign/copy-review.tsx`, `src/components/campaign/push-status.tsx`
