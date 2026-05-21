# WSG Outbound — Claude Code Project Guide

This file is the canonical guide for building and maintaining `wsgoutbound`. Read it before making architectural decisions. Update it when you make decisions worth remembering.

---

## What this is

An internal tool for **Watson Style Group** to run outbound email campaigns end-to-end:

1. Human writes a campaign brief (target persona, value prop, CTA, filters)
2. Claude generates BigQuery SQL against a 400M+ contact warehouse
3. Human reviews SQL results, refines (add/exclude titles, geo, etc.) in a loop
4. Human approves volume to enrich
5. LeadMagic finds and validates work emails
6. Claude generates a master email sequence + per-lead personalization
7. Human reviews and approves copy
8. App pushes leads + personalization tokens to Instantly
9. Human goes to Instantly to configure sending and launch

The app is **single-tenant for WSG**. If we later need USAI or Critical Mass Talent, we deploy separate instances rather than refactoring to multi-tenant.

---

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui | Server Actions where possible |
| Auth | Clerk | Single user (Karl) |
| DB | Supabase Postgres + pgvector + Vault | URL: `https://oujiouxbtckkxwfohoyy.supabase.co` |
| Async / orchestration | Inngest | Free tier; `step.waitForEvent` for human-in-loop |
| LLM (generation) | Anthropic API — Claude Sonnet 4.6 default | Opus optional for copy if voice matters |
| LLM (embeddings) | Voyage AI (`voyage-3`) | Or OpenAI `text-embedding-3-small` as alt |
| Data source | BigQuery (Karl's GCP project, read-only service account) | 400M+ contacts |
| Enrichment | LeadMagic | Bulk submission preferred over per-row |
| Sending | Instantly | API push leads into existing campaigns |
| Hosting | Vercel | NOT Netlify — Vercel for Next + Server Actions + Inngest |
| Repo | GitHub | `github.com/karlryan-a11y/wsgoutbound` |

> Note: this project may have been scaffolded via v0. Refactor v0 output to match the structure and patterns described below.

---

## Architecture overview

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js (Vercel)                        │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐   │
│  │   Pages      │    │ Server       │   │ Inngest      │   │
│  │  /, /new,    │◄──►│ Actions      │◄─►│ /api/inngest │   │
│  │  /c/[id]     │    │              │   │              │   │
│  └──────────────┘    └──────────────┘   └──────┬───────┘   │
└─────────────────────────────────────────────────┼──────────┘
                                                  │
                       ┌──────────────────────────┼───────────┐
                       │                          ▼           │
                ┌──────▼──────┐         ┌────────────────┐    │
                │  Supabase   │         │ Inngest Cloud  │    │
                │  Postgres   │         │ (event bus +   │    │
                │  + pgvector │         │  function      │    │
                │  + Vault    │         │  executor)     │    │
                └─────────────┘         └────────┬───────┘    │
                                                 │            │
              ┌──────────────────────────────────┼────────────┘
              ▼                ▼                 ▼               
       ┌──────────┐    ┌──────────┐      ┌──────────────┐  ┌──────────┐
       │ BigQuery │    │LeadMagic │      │  Anthropic   │  │ Instantly│
       │ (source) │    │(enrich)  │      │   (Claude)   │  │ (sender) │
       └──────────┘    └──────────┘      └──────────────┘  └──────────┘
```

**Key principle**: Next.js owns UI + primary state (Supabase). Inngest owns long-running orchestration with human-in-loop checkpoints. UI updates by polling Supabase OR subscribing to realtime channels.

---

## Data model

Run migrations in Supabase SQL editor. Enable extensions first.

```sql
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------- campaigns ----------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  -- statuses: draft, awaiting_sql_review, querying, 
  --   awaiting_volume, enriching, awaiting_copy_review, 
  --   pushing, completed, failed, cancelled
  brief jsonb not null,
  -- brief shape: { persona, titles_include[], titles_exclude[], 
  --   geographies[], industries[], company_size, value_prop, 
  --   proof_points[], cta, tone, sequence_length, 
  --   personalization_depth, instantly_campaign_id, ... }
  sql_versions jsonb[] default array[]::jsonb[],
  -- each version: { sql, reasoning, feedback, row_count, sample, ts }
  candidate_count int,
  enriched_count int,
  valid_count int,
  master_copy jsonb,
  -- shape: { steps: [{ subject, body, delay_days }], approved_at }
  instantly_campaign_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index on campaigns(status);
create index on campaigns(created_at desc);

-- ---------- leads ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  source_data jsonb not null,    -- raw row from BigQuery
  email text,
  email_status text,             -- valid, risky, invalid, catch_all, unknown
  personalization jsonb,         -- { first_line, company_note, ... }
  pushed_to_instantly_at timestamptz,
  instantly_lead_id text,
  created_at timestamptz default now()
);

create index on leads(campaign_id);
create index on leads(email);
create index on leads(email_status);

-- ---------- knowledge base (RAG) ----------
create table knowledge (
  id uuid primary key default gen_random_uuid(),
  type text not null,            -- doc, note, case_study, email_sample, transcript, brand
  title text not null,
  content text not null,
  embedding vector(1024),        -- voyage-3 dimensionality; change if using OpenAI
  source text,                   -- upload | manual | conversation | auto
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on knowledge using ivfflat (embedding vector_cosine_ops);
create index on knowledge using gin(tags);

-- ---------- instructions (always-apply rules) ----------
create table instructions (
  id uuid primary key default gen_random_uuid(),
  rule text not null,
  category text not null,        -- filter, tone, vocabulary, suppression
  active boolean default true,
  created_at timestamptz default now(),
  last_referenced_at timestamptz
);

-- ---------- outcomes (learning loop) ----------
create table outcomes (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  sent_count int default 0,
  opened_count int default 0,
  replied_count int default 0,
  positive_reply_count int default 0,
  what_worked text,
  what_didnt text,
  notes text,
  updated_at timestamptz default now()
);

-- ---------- suppression ----------
create table suppression (
  id uuid primary key default gen_random_uuid(),
  email text,
  domain text,
  reason text,                   -- replied, customer, manual, bounce
  created_at timestamptz default now()
);

create unique index on suppression(email) where email is not null;
create index on suppression(domain);
```

**RLS**: enable RLS on all tables. Single-user app, so policy is "authenticated users can do everything." Add policies after auth is wired.

---

## Directory structure

```
/app
  /                       → dashboard (recent campaigns)
  /new                    → campaign brief form
  /c/[id]                 → campaign detail (stages render based on status)
  /knowledge              → KB upload + browse
  /instructions           → rules management
  /settings               → defaults, integration health
  /api/inngest            → Inngest webhook
/components
  /ui                     → shadcn primitives
  /campaign               → stage components (SqlReview, VolumePicker, CopyReview, etc.)
  /knowledge              → upload, browse
/lib
  /supabase               → server + client helpers
  /anthropic              → Claude API wrappers + prompt builders
  /bigquery               → BQ client + query execution
  /leadmagic              → API client + bulk job helpers
  /instantly              → API client + push helpers
  /voyage                 → embedding helpers
  /inngest                → client + function exports
  /rag                    → retrieval + ranking helpers
/inngest
  /functions              → one file per workflow function
/types                    → shared TS types
/sql                      → migration files
```

---

## Key patterns

### 1. Inngest workflow with human-in-loop

```ts
// inngest/functions/run-campaign.ts
import { inngest } from "@/lib/inngest"
import { generateSql, runBigQuery, refineSqlWithFeedback } from "@/lib/..."

export const runCampaign = inngest.createFunction(
  { id: "run-campaign", retries: 3 },
  { event: "campaign/submitted" },
  async ({ event, step }) => {
    const { campaignId } = event.data

    // SQL review loop
    let approved = false
    while (!approved) {
      const sqlVersion = await step.run("gen-sql", async () => {
        return await generateSql(campaignId)
      })

      await step.run("save-sql-version", async () => {
        await saveSqlVersion(campaignId, sqlVersion)
      })

      const sample = await step.run("query-bq", async () => {
        return await runBigQuery(sqlVersion.sql, { limit: 25 })
      })

      await step.run("update-status", async () => {
        await setStatus(campaignId, "awaiting_sql_review", { sample })
      })

      const review = await step.waitForEvent("wait-sql-review", {
        event: "campaign/sql-reviewed",
        match: "data.campaignId",
        timeout: "7d"
      })

      if (review.data.action === "approve") {
        approved = true
      } else {
        await step.run("apply-feedback", async () => {
          await refineSqlWithFeedback(campaignId, review.data.feedback)
        })
      }
    }

    // Volume picker
    await step.run("set-awaiting-volume", () => 
      setStatus(campaignId, "awaiting_volume"))
    
    const volume = await step.waitForEvent("wait-volume", {
      event: "campaign/volume-set",
      match: "data.campaignId",
      timeout: "7d"
    })

    // ... continue: enrich → copy review → push to Instantly
  }
)
```

Trigger events from Server Actions:

```ts
// app/c/[id]/actions.ts
"use server"
import { inngest } from "@/lib/inngest"

export async function submitSqlReview(campaignId: string, action: "approve" | "refine", feedback?: string) {
  await inngest.send({
    name: "campaign/sql-reviewed",
    data: { campaignId, action, feedback }
  })
}
```

### 2. Claude API calls — always with system prompt + RAG context

```ts
// lib/anthropic/generate-sql.ts
import Anthropic from "@anthropic-ai/sdk"
import { retrieveKnowledge } from "@/lib/rag"
import { getActiveInstructions } from "@/lib/instructions"

const client = new Anthropic()

export async function generateSql(brief: CampaignBrief, schemaContext: string) {
  const knowledge = await retrieveKnowledge(brief.persona, { limit: 5, type: "icp" })
  const instructions = await getActiveInstructions("filter")

  const system = `You are a BigQuery SQL writer for Watson Style Group's outbound campaigns.

CONTEXT — BigQuery schema:
${schemaContext}

CONTEXT — relevant knowledge:
${knowledge.map(k => `[${k.title}]\n${k.content}`).join("\n\n")}

RULES (always apply):
${instructions.map(i => `- ${i.rule}`).join("\n")}

Output JSON only: { "sql": "...", "reasoning": "..." }
Use standard BigQuery SQL. Cap with LIMIT 1000 unless explicitly told otherwise.`

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: JSON.stringify(brief) }]
  })

  return parseJsonResponse(response)
}
```

### 3. LeadMagic — use bulk endpoints

Never loop per-row tools. For email finding on N leads:

```ts
// lib/leadmagic/enrich.ts
export async function enrichCampaign(campaignId: string, leads: Lead[]) {
  // Submit one bulk job, not N calls
  const job = await fetch("https://api.leadmagic.io/bulk/submit", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.LEADMAGIC_API_KEY!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      endpoint: "email-finder",
      product: "email_finder",
      rows: leads.map(l => ({
        first_name: l.source_data.first_name,
        last_name: l.source_data.last_name,
        company_domain: l.source_data.company_domain
      }))
    })
  }).then(r => r.json())

  // Poll job status in an Inngest step
  return job.job_id
}
```

LeadMagic API docs: https://docs.leadmagic.io

### 4. Instantly — push leads with personalization vars

```ts
// lib/instantly/push.ts
export async function pushLeadsToInstantly(campaignId: string, leads: ValidLead[]) {
  const instantlyCampaignId = await getInstantlyCampaignId(campaignId)
  
  // Bulk add via Instantly v2 API
  const response = await fetch("https://api.instantly.ai/api/v2/leads", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.INSTANTLY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      campaign: instantlyCampaignId,
      leads: leads.map(l => ({
        email: l.email,
        first_name: l.source_data.first_name,
        last_name: l.source_data.last_name,
        company_name: l.source_data.company_name,
        custom_variables: {
          first_line: l.personalization.first_line,
          company_note: l.personalization.company_note
        }
      }))
    })
  })
  
  return response.json()
}
```

Instantly v2 API docs: https://developer.instantly.ai

### 5. RAG retrieval

```ts
// lib/rag/retrieve.ts
import { embed } from "@/lib/voyage"
import { supabaseServer } from "@/lib/supabase/server"

export async function retrieveKnowledge(query: string, opts: { limit?: number; type?: string } = {}) {
  const [embedding] = await embed([query])
  const supabase = supabaseServer()
  
  const { data } = await supabase.rpc("match_knowledge", {
    query_embedding: embedding,
    match_count: opts.limit ?? 5,
    filter_type: opts.type ?? null
  })
  
  return data ?? []
}
```

Companion Supabase function:

```sql
create or replace function match_knowledge(
  query_embedding vector(1024),
  match_count int default 5,
  filter_type text default null
)
returns table (id uuid, title text, content text, type text, similarity float)
language sql stable as $$
  select k.id, k.title, k.content, k.type,
         1 - (k.embedding <=> query_embedding) as similarity
  from knowledge k
  where filter_type is null or k.type = filter_type
  order by k.embedding <=> query_embedding
  limit match_count;
$$;
```

### 6. Embeddings — Voyage

```ts
// lib/voyage/embed.ts
export async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: texts,
      model: "voyage-3"
    })
  })
  const json = await response.json()
  return json.data.map((d: any) => d.embedding)
}
```

---

## Campaign brief shape

This is the JSON stored in `campaigns.brief`. Form maps directly to it.

```ts
type CampaignBrief = {
  // Core
  persona: string                    // free text
  titles_include: string[]
  titles_exclude?: string[]
  geographies: string[]              // ["NYC", "California", ...]
  industries?: string[]
  company_size?: { min?: number; max?: number }
  
  // Messaging
  value_prop: string                 // free text
  proof_points?: string[]
  cta: string
  tone: "luxury_formal" | "consultative" | "direct"
  sequence_length: 3 | 5 | 7
  personalization_depth: "none" | "opener" | "opener_plus_company"
  reference_knowledge_ids?: string[] // FK to knowledge table
  
  // Volume
  max_candidates: number             // default 1000
  max_enrich: number                 // default 200
  validation_strictness: "valid_only" | "valid_and_risky"
  
  // Suppression
  exclude_domains?: string[]
  apply_default_suppression: boolean // default true
  
  // Send
  instantly_campaign_id: string
}
```

---

## UI flow

| Route | Component | Behavior |
|---|---|---|
| `/` | Dashboard | List of campaigns w/ status badges. Prominent "New Campaign" button. Top-of-page command palette: type "new campaign for family offices in CA" → routes to `/new` with persona prefilled. |
| `/new` | BriefForm | 5 sections, progressive disclosure. Section 1 always visible. Submit → creates `campaigns` row, fires `campaign/submitted` event, redirects to `/c/[id]`. |
| `/c/[id]` | CampaignDetail | Renders stage component based on `status`. Polls Supabase or subscribes to realtime channel for status changes. |
| `/c/[id]` → SqlReview | When `status = awaiting_sql_review` | Shows current SQL + reasoning + 25-row sample. Inputs: titles to add, titles to drop, geo refinements, free text feedback. Buttons: Approve / Refine. |
| `/c/[id]` → VolumePicker | When `status = awaiting_volume` | Shows total candidates, slider for # to enrich, cost preview (use LeadMagic's preview-cost endpoint). |
| `/c/[id]` → CopyReview | When `status = awaiting_copy_review` | Shows master sequence (editable inline) + 3 sample personalizations. Approve → triggers push. |
| `/c/[id]` → PushConfirm | When `status = pushing | completed` | Shows leads pushed, Instantly campaign link, next-step prompt: "Configure sending in Instantly". |
| `/knowledge` | KnowledgeBrowser | Upload PDF/paste text/add URL. Lists existing docs by type. Inline edit. |
| `/instructions` | InstructionsManager | List of active rules grouped by category. Add/edit/deactivate. |
| `/settings` | Settings | Integration health checks (ping each API), default voice prompt editor, suppression rules upload. |

---

## Prompting patterns

Three Claude API calls dominate cost and quality:

### SQL generation
- System: BQ schema + retrieved knowledge + active filter instructions
- User: serialized CampaignBrief
- Output: JSON `{ sql, reasoning }`
- Model: Sonnet 4.6

### Master copy generation
- System: brand voice prompt + tone instructions + relevant case studies + winning email samples (retrieved from KB)
- User: `{ value_prop, proof_points, cta, persona, sample_lead_profiles[] }`
- Output: JSON `{ steps: [{ subject, body, delay_days }] }`
- Model: Sonnet 4.6 (try Opus 4.7 for A/B comparison if voice feels off)

### Per-lead personalization
- System: voice prompt + master sequence context + "your job: write `first_line` and `company_note` for this lead, no more"
- User: `{ lead_data: { headline, title, company, recent_role, ... } }`
- Output: JSON `{ first_line, company_note }`
- Model: Sonnet 4.6
- Run in parallel (Inngest fan-out) at concurrency 10–20

Always:
- Use JSON mode / structured output
- Cap `max_tokens` aggressively
- Inject `instructions` table rules every time — these are how the system "learns"
- Log prompts + responses to a debug table during dev so you can audit when output is off

---

## Conventions

- **TypeScript everywhere.** No `any` unless interfacing with untyped APIs.
- **Server Actions for mutations.** API routes only for webhooks (Inngest, Instantly callbacks if any).
- **Supabase service role key only on server.** Anon key for client.
- **Errors:** throw typed errors, catch at action boundary, return `{ ok: false, error }` to client.
- **Forms:** React Hook Form + zod validation.
- **Tables:** TanStack Table for the SQL review sample and lead lists.
- **Styling:** Tailwind + shadcn/ui. No CSS modules. Keep it boring and consistent.
- **Naming:** files kebab-case, exports camelCase, types PascalCase.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`).

---

## Build phases

Don't try to build everything at once. Order:

**Phase 1 — Foundation (Day 1)**
- Scaffold Next.js + Tailwind + shadcn
- Wire Clerk auth
- Connect Supabase, run migration
- Connect Inngest (hello-world function)
- Connect Vercel deploy

**Phase 2 — Brief → SQL loop (Day 2)**
- `/new` form (Section 1 only)
- Inngest `runCampaign` function — SQL gen + BQ query
- `/c/[id]` SqlReview stage
- Refine loop wired end-to-end

**Phase 3 — Enrichment + copy (Day 3)**
- VolumePicker stage
- LeadMagic bulk enrich
- Copy gen + CopyReview stage
- Per-lead personalization fan-out

**Phase 4 — Push + KB (Day 4)**
- Instantly push integration
- Knowledge upload + embed + retrieve
- Wire RAG into SQL + copy prompts

**Phase 5 — Polish (Day 5)**
- Instructions management
- Suppression checking
- Dashboard + history
- Error states, empty states, loading states

---

## Don't do

- **Don't store API keys in env vars long-term** — use Supabase Vault once multi-tenant.
- **Don't loop LeadMagic per-row.** Use bulk endpoints.
- **Don't auto-send.** Karl always approves before push. Push to Instantly ≠ send; sending config happens in Instantly UI.
- **Don't put service role key in client.** Server-only.
- **Don't bypass the Inngest event for state changes.** Server Actions trigger events; events update Supabase; UI reads Supabase. One direction.
- **Don't embed on every read.** Embed on knowledge write only. Retrieval uses precomputed embeddings.
- **Don't use OpenAI's embedding model AND Voyage's in the same table.** Different dimensionalities. Pick one. Voyage `voyage-3` = 1024 dims.
- **Don't fetch from `localhost` in Inngest functions.** Inngest runs in Inngest's cloud; functions hit your deployed Vercel URL. Use `INNGEST_DEV` flag for local dev.
- **Don't write SQL that scans the whole 400M-row table without filters.** Always `WHERE` on indexed columns. Karl pays the BQ bill.
- **Don't push to Instantly without a campaign_id.** Verify the destination exists.

---

## External services — quick reference

| Service | Purpose | Docs | Auth |
|---|---|---|---|
| Supabase | DB + Vault + Realtime | docs.supabase.com | Project URL + anon key (client) + service role (server) |
| Clerk | Auth | clerk.com/docs | Publishable + secret keys |
| Inngest | Async + waitForEvent | inngest.com/docs | Event key + signing key |
| Anthropic | Claude API | docs.claude.com | `ANTHROPIC_API_KEY` |
| Voyage | Embeddings | docs.voyageai.com | API key |
| LeadMagic | Email find + validate + mobile | docs.leadmagic.io | `X-API-Key` header |
| Instantly v2 | Lead push + campaign mgmt | developer.instantly.ai | Bearer token |
| BigQuery | Prospect data source | cloud.google.com/bigquery/docs | Service account JSON |
| Vercel | Hosting | vercel.com/docs | (handled by GitHub integration) |

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/karlryan-a11y/wsgoutbound.git
cd wsgoutbound

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Fill in all keys

# 4. Run migrations
# Paste sql/0001_init.sql into Supabase SQL editor

# 5. Dev
npm run dev
# In a second terminal:
npx inngest-cli@latest dev
```

---

## When in doubt

- Read this file first. Update it when decisions change.
- Prefer boring over clever. This is an internal tool, not a portfolio piece.
- Push back on Karl's instincts when they conflict with what's here. The point of this doc is to keep architecture stable across long sessions.
- Ask before introducing new services or libraries. Stack creep is the enemy.
