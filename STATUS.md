# WSG Outbound — Project Status

**Last updated:** 2026-05-21
**Repo:** github.com/karlryan-a11y (pushed as `feat: scaffold WSG Outbound — Phase 1 foundation`)
**Location:** `/Users/karlwatson/Downloads/wsgoutbound`

---

## What This Is

Internal tool for Watson Style Group to run outbound email campaigns end-to-end:
**Brief** -> **AI-generated SQL** -> **Human review** -> **Volume pick** -> **Email enrichment** -> **AI copy generation** -> **Human copy review** -> **Push to Instantly**

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), shadcn/ui, Tailwind, dark mode |
| Auth | Clerk (single-user, Karl only) |
| Database | Supabase Postgres + pgvector |
| Orchestration | Inngest (async steps, human-in-loop via `waitForEvent`) |
| AI - SQL/Copy | Anthropic Claude Sonnet 4.6 |
| AI - Embeddings | Voyage AI (voyage-3, 1024 dims) |
| Contact Data | BigQuery (400M+ contacts: apollo.people, apollo.linkedin_us, apollo.orgs) |
| Enrichment | LeadMagic bulk email finder |
| Sending | Instantly.ai v2 API |

---

## What's Done (Phase 1 Scaffold)

### Infrastructure
- [x] Next.js 16 project with TypeScript, Tailwind, shadcn/ui
- [x] Clerk auth middleware (protects all routes except sign-in/up and `/api/inngest`)
- [x] Supabase client (server + browser) with service role key for Inngest
- [x] Inngest client + dev server integration
- [x] Anthropic client singleton with explicit apiKey passing
- [x] BigQuery client using ADC (Application Default Credentials) locally
- [x] Voyage AI embedding client
- [x] RAG retrieval (`match_knowledge` RPC via pgvector)
- [x] Instructions system (always-apply rules by category)
- [x] LeadMagic client (bulk submit/status/results) — **needs API key**
- [x] Instantly client (push leads, list campaigns)

### Database (Supabase)
- [x] Migration `0001_init.sql` run successfully in SQL Editor
- [x] 7 tables: campaigns, leads, knowledge, instructions, outcomes, suppression, debug_log
- [x] RLS policies for authenticated + service_role
- [x] `match_knowledge` vector search function
- [x] pgvector + pgcrypto extensions enabled

### Pages & Components
- [x] `/` — Dashboard listing campaigns with status badges
- [x] `/new` — Campaign creation form (persona, targeting, messaging, volume, send config)
- [x] `/c/[id]` — Campaign detail page with stage-specific components:
  - [x] `SqlReview` — shows generated SQL, reasoning, sample results table, approve/refine actions
  - [x] `VolumePicker` — slider to choose enrichment count
  - [x] `CopyReview` — email sequence review with approve/reject
  - [x] `PushStatus` — completion status display
  - [x] `RefreshButton` — client component for page refresh
  - [x] Processing state (gear icon + status text)
  - [x] Failed/cancelled state
- [x] `/sign-in`, `/sign-up` — Clerk auth pages
- [x] `/knowledge`, `/instructions`, `/settings` — placeholder pages

### Inngest Workflow (`run-campaign`)
- [x] **Phase 1 — SQL Generation + Review Loop**: Claude generates BigQuery SQL from brief, runs sample query, saves version, waits for human review, supports refine-with-feedback loop
- [x] **Phase 2 — Volume Selection**: Waits for human to pick enrichment count, runs full BQ query, stores leads in batches of 100
- [ ] **Phase 3 — Enrichment**: TODO — LeadMagic bulk email finder integration
- [x] **Phase 4 — Copy Generation + Review**: Claude generates master email sequence, waits for human approval
- [ ] **Phase 5 — Personalization + Push**: TODO — per-lead personalization fan-out, push to Instantly

### Server Actions
- [x] `createCampaign` — inserts campaign + fires `campaign/submitted` event
- [x] `submitSqlReview` — fires `campaign/sql-reviewed` event (approve/refine + feedback)
- [x] `submitVolumeSelection` — fires `campaign/volume-set` event
- [x] `submitCopyReview` — fires `campaign/copy-reviewed` event

### BigQuery Schema Mapped
- [x] `apollo.people` — 93M rows, standard Apollo fields
- [x] `apollo.linkedin_us` — 39.9M rows, richer schema (job_summary, company_size, etc.)
- [x] `apollo.orgs` — 6M rows, generic column names (string_field_0, etc.) — **needs column mapping**

---

## Verified Working (End-to-End)

The full flow from campaign creation through SQL generation was tested successfully:

1. Created campaign "estate managers" via the UI form
2. Inngest received `campaign/submitted` event
3. Claude generated a BigQuery SQL query targeting estate/house/household managers in UHNW private households
4. BigQuery executed the query and returned **543 candidates**
5. Campaign status updated to `awaiting_sql_review` in Supabase
6. Campaign detail page shows SQL review UI with generated query + sample results

**Test campaign ID:** `99b504f7-3bee-4762-87fa-41ae5d981f60` (status: `awaiting_sql_review`, 543 candidates)

---

## Known Issues & Fixes Applied

| Issue | Root Cause | Fix |
|---|---|---|
| `ANTHROPIC_API_KEY` not found at runtime | Claude Code sets an empty system-level `ANTHROPIC_API_KEY=` which overrides `.env.local` | Added `dotenv({ override: true })` in `next.config.ts` to force `.env.local` values over system env vars |
| Server Component onClick error | `onClick` handler in server component `page.tsx` | Extracted `RefreshButton` client component |
| Inngest `createFunction` API error | Used `trigger` (singular) instead of `triggers` (array) | Changed to `triggers: [{ event: "..." }]` for Inngest v4 |
| `fetch failed` on campaign creation | Inngest dev server not running | Wrapped `inngest.send()` in try/catch so campaign still saves |
| Slider type error | `onValueChange` type mismatch | Added `Array.isArray(v) ? v[0] : v` |
| shadcn components not installing | Wrong CSS path in `components.json` | Fixed to `src/app/globals.css` |
| tsconfig paths wrong | `@/*` mapped to `./*` instead of `./src/*` | Fixed paths |
| Supabase migration via terminal failed | psql pooler connection issues | Used SQL Editor in dashboard instead |
| GCP service account key blocked | Org policy `iam.disableServiceAccountKeyCreation` | Used ADC (Application Default Credentials) instead |

---

## What's Next (Priority Order)

### 1. LeadMagic Integration (Phase 3 Enrichment)
- **Blocker:** ~~Need `LEADMAGIC_API_KEY` in `.env.local`~~ DONE
- LeadMagic account is active: `karl@utilitysavings.ai`, 4,539 credits, 1 credit/email lookup
- Wire bulk email finder into Inngest workflow (submit job -> poll status -> fetch results -> update leads)
- Update `src/lib/leadmagic/client.ts` endpoints to match actual API
- Add enrichment polling step with backoff in `run-campaign.ts` Phase 3

### 2. Personalization + Push to Instantly (Phase 5)
- Per-lead personalization fan-out using Claude (generate `first_line` + `company_note`)
- Push enriched + personalized leads to Instantly via API
- The `generatePersonalization` function exists but isn't wired into the workflow yet

### 3. Knowledge Base & Instructions UI
- `/knowledge` page — upload docs, notes, case studies for RAG context
- `/instructions` page — manage always-apply rules (filter, tone, vocabulary, suppression)
- Embedding pipeline: upload -> chunk -> embed via Voyage -> store in pgvector

### 4. Polish & Error States
- Loading states on all async operations
- Error boundaries and retry UI
- Empty states for new accounts
- Campaign list filtering/search
- Suppression list management

### 5. `apollo.orgs` Column Mapping
- Table has generic column names (`string_field_0`, `string_field_1`, etc.)
- Need to sample data and create a mapping to meaningful names
- Update `src/lib/bigquery/schema.ts` with the mapping

### 6. Deploy to Vercel
- Push latest changes to GitHub
- Connect repo to Vercel
- Set all env vars (use `vercel env` or dashboard)
- BigQuery needs service account JSON for production (not ADC) — may need to work around GCP org policy
- Inngest cloud setup (swap dev keys for production)

---

## How to Run Locally

```bash
cd /Users/karlwatson/Downloads/wsgoutbound

# 1. Start Next.js dev server (must set ANTHROPIC_API_KEY explicitly due to Claude Code conflict)
ANTHROPIC_API_KEY="<your-key-from-env-local>" npm run dev

# 2. In another terminal, start Inngest dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

# 3. Ensure gcloud ADC is configured for BigQuery
gcloud auth application-default login

# App: http://localhost:3000
# Inngest dashboard: http://localhost:8288
```

---

## File Map

```
src/
  app/
    api/inngest/route.ts          # Inngest webhook handler
    c/[id]/page.tsx               # Campaign detail (server component)
    c/[id]/actions.ts             # Server actions for review events
    new/page.tsx                  # Campaign creation form
    new/actions.ts                # createCampaign server action
    page.tsx                      # Dashboard
    layout.tsx                    # Root layout (Clerk, dark mode, Toaster)
  components/campaign/
    sql-review.tsx                # SQL review stage
    volume-picker.tsx             # Volume selection stage
    copy-review.tsx               # Email copy review stage
    push-status.tsx               # Push completion status
    refresh-button.tsx            # Client-side refresh
  inngest/functions/
    run-campaign.ts               # Main orchestration workflow
  lib/
    anthropic/client.ts           # Anthropic singleton
    anthropic/generate-sql.ts     # SQL generation with RAG + instructions
    anthropic/generate-copy.ts    # Master copy + per-lead personalization
    bigquery/client.ts            # BigQuery with ADC
    bigquery/schema.ts            # BQ schema reference for prompts
    inngest/client.ts             # Inngest client
    instantly/client.ts           # Instantly API client
    leadmagic/client.ts           # LeadMagic bulk API client
    rag/retrieve.ts               # Vector similarity search
    instructions.ts               # Active rules retrieval
    supabase/server.ts            # Supabase server client
    supabase/client.ts            # Supabase browser client
    voyage/embed.ts               # Voyage embedding client
  types/index.ts                  # All shared TypeScript types
  middleware.ts                   # Clerk auth middleware
sql/
  0001_init.sql                   # Supabase migration (already applied)
next.config.ts                    # Includes dotenv override fix
```
