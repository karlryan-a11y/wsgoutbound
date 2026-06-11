# WSG Outbound — Build File

**Run this with:** `cd ~/Downloads/wsgoutbound && caffeinate -dims bash -c 'claude --dangerously-skip-permissions -p "$(cat BUILD-NEXT.md)"'`

This file contains everything Claude Code needs to build the remaining features for WSG Outbound. Read the entire file before starting. Execute each action sequentially. Do NOT ask questions — make reasonable decisions and keep going. If something fails, fix it and continue.

---

## CONTEXT

WSG Outbound is an internal outbound email campaign tool for Watson Style Group. Single tenant (one user: Karl). It's a Next.js 16 App Router app with Clerk auth, Supabase Postgres, Inngest orchestration, Claude AI for SQL/copy gen, BigQuery for contact data, LeadMagic for email verification, and Instantly.ai for campaign push.

**Working directory:** `~/Downloads/wsgoutbound`
**Live URL:** https://wsgoutbound.vercel.app
**Supabase project:** oujiouxbtckkxwfohoyy (env vars in `.env.local`)

### Brand System (WSG Luxury Dark)

- **Serif:** `"Schnyder M", Georgia, serif` → headings only
- **Sans:** `"Neue Haas Grotesk", "Helvetica Neue", Arial, sans-serif` → everything else, weight 300 body, 400-500 UI
- **Accent:** Camel `#BE7B44`
- **Background:** `#050505`
- **Success:** `#2D500D`
- **Warning:** `#BE7B44`
- **Error:** `#C30319`
- **Lines:** `rgba(255,255,255,0.08)`
- **NO border-radius anywhere** — sharp luxury edges. `--radius: 0rem` is set globally.
- **Dark mode only** — `<html className="dark">`
- **Selection color:** blush `#F8E5E7` on black
- **Eyebrow style:** `font-size: 0.72rem; font-weight: 500; letter-spacing: 0.32em; text-transform: uppercase; color: rgba(255,255,255,0.4)`
- **Button style:** `.wsg-btn-primary` (solid white, black text), `.wsg-btn-ghost` (border + text, inverts on hover), `.wsg-btn-muted` (subtle border)
- **Fonts loaded from:** `/public/fonts/schnyder/` and `/public/fonts/neue-haas/`
- **Logo:** `/public/logos/W_Icon_White.svg` at 108px in header
- **Favicons:** `/public/favicon.ico`, `/public/favicon-16.png`, `/public/favicon-32.png`, `/public/apple-touch-icon.png`
- **OG image:** `/public/og-share.jpg`
- **Cursor:** `/public/cursor-glove.png` — white-glove cursor, use on hover-capable devices only

### Existing CSS Variables (in `src/app/globals.css`)

```
--serif, --sans, --wsg-black, --wsg-white, --wsg-blush, --wsg-camel, --wsg-green, --wsg-butter, --wsg-red, --wsg-blue, --wsg-muted
--line, --line-strong, --surface-raised, --surface-hover
```

### Key Types (in `src/types/index.ts`)

```typescript
CampaignStatus = "draft" | "awaiting_sql_review" | "querying" | "awaiting_volume" | "enriching" | "awaiting_copy_review" | "pushing" | "completed" | "failed" | "cancelled"

Knowledge = { id, type: "doc"|"note"|"case_study"|"email_sample"|"transcript"|"brand", title, content, embedding?, source, tags, created_at, updated_at }

Instruction = { id, rule, category: "filter"|"tone"|"vocabulary"|"suppression", active, created_at, last_referenced_at }
```

### Database Tables Already Exist

All tables are created — `campaigns`, `leads`, `knowledge`, `instructions`, `outcomes`, `suppression`, `debug_log`, `enrichment_log`. RLS policies are in place. The `match_knowledge` RPC function exists. DO NOT create tables or run migrations — just build the app code.

### Middleware (src/middleware.ts)

Clerk protects all routes except: `/sign-in`, `/sign-up`, `/api/inngest`, `/api/admin/*`, `/api/campaign/*/progress`, `/api/campaign/*/cancel`. New API routes that need to be public must be added to the `isPublicRoute` matcher.

### What's Already Built and Working

- Full campaign pipeline: brief → SQL gen → BQ query → SQL review → volume → enrichment → copy gen → copy review → personalization → Instantly push
- All campaign stage components (SqlReview, VolumePicker, LiveProgress, CopyReview, PushStatus)
- Pipeline stepper on campaign detail page
- NL input on dashboard with example chips
- Cost estimate on volume picker
- Error handling with failure reasons
- Stall detection (90s warning, 180s error)
- Cancel/stop enrichment
- RAG retrieval via Voyage embeddings (backend works)
- Instruction injection into prompts (backend works)

### What's NOT Built (This File Builds These)

1. **Brand polish** — favicons, OG image, cursor, font preloading in layout
2. **Knowledge management page** (`/knowledge`) — CRUD + Voyage embedding on write
3. **Instructions/Rules management page** (`/instructions`) — CRUD by category with toggle
4. **Suppression import** — CSV upload on instructions page
5. **Settings + health checks** (`/settings`)

---

## ACTION 0: BRAND POLISH — Favicons, OG Image, Cursor, Font Preloading

Update `src/app/layout.tsx` to add favicons, OG image metadata, and font preloading. Add the white-glove cursor CSS to `globals.css`.

### layout.tsx changes

Replace the entire `src/app/layout.tsx` with:

```typescript
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import "./globals.css"

export const metadata: Metadata = {
  title: "WSG Outbound",
  description: "Watson Style Group — Outbound Campaign Manager",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "WSG Outbound",
    description: "Watson Style Group — Outbound Campaign Manager",
    images: [{ url: "/og-share.jpg", width: 1200, height: 630 }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preload" href="/fonts/schnyder/Schnyder-MLight-Web.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/neue-haas/NHaasGroteskDSPro-45Lt.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/neue-haas/NHaasGroteskDSPro-55Rg.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <Header />
          <main className="relative flex min-h-[calc(100vh-96px)] flex-col">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
```

### globals.css addition

At the end of `src/app/globals.css`, add the white-glove cursor:

```css
/* White-glove cursor — hover devices only */
@media (hover: hover) {
  html.dark,
  html.dark *,
  html.dark a,
  html.dark button {
    cursor: url('/cursor-glove.png') 7 1, auto;
  }
}
```

---

## ACTION 1: KNOWLEDGE MANAGEMENT PAGE

Build the full `/knowledge` page with API routes for CRUD + Voyage embedding on create/update. This feeds the RAG pipeline that improves SQL generation and copy writing.

### 1a. API Route: `src/app/api/knowledge/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { embed } from "@/lib/voyage/embed"

export async function GET(req: NextRequest) {
  const db = supabaseServer()
  const type = req.nextUrl.searchParams.get("type")

  let query = db.from("knowledge").select("id, type, title, content, source, tags, created_at, updated_at").order("created_at", { ascending: false })

  if (type) query = query.eq("type", type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = supabaseServer()
  const body = await req.json()
  const { title, content, type, tags, source } = body

  if (!title || !content || !type) {
    return NextResponse.json({ error: "title, content, and type are required" }, { status: 400 })
  }

  // Generate embedding via Voyage
  let embedding: number[] | null = null
  try {
    const vectors = await embed([`${title}\n\n${content}`])
    embedding = vectors[0]
  } catch (e) {
    console.error("Voyage embedding failed:", e)
  }

  const { data, error } = await db
    .from("knowledge")
    .insert({
      title,
      content,
      type,
      tags: tags || [],
      source: source || "manual",
      embedding,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

### 1b. API Route: `src/app/api/knowledge/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { embed } from "@/lib/voyage/embed"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseServer()
  const { data, error } = await db.from("knowledge").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseServer()
  const body = await req.json()
  const { title, content, type, tags } = body

  // Re-embed if content changed
  let embedding: number[] | null = null
  if (content) {
    try {
      const vectors = await embed([`${title || ""}\n\n${content}`])
      embedding = vectors[0]
    } catch (e) {
      console.error("Voyage embedding failed:", e)
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) update.title = title
  if (content !== undefined) update.content = content
  if (type !== undefined) update.type = type
  if (tags !== undefined) update.tags = tags
  if (embedding) update.embedding = embedding

  const { data, error } = await db.from("knowledge").update(update).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseServer()
  const { error } = await db.from("knowledge").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

### 1c. Page: `src/app/knowledge/page.tsx`

Replace the placeholder. Build a full page with:

- Teaching empty state: "Your reference library is empty. Add brand docs, winning emails, and case studies. Each entry is automatically embedded and referenced when generating search queries and email sequences."
- Add entry form: title input, content textarea, type dropdown (`doc`, `note`, `case_study`, `email_sample`, `transcript`, `brand`), tags input (comma-separated)
- List entries grouped by type as collapsible sections
- Each entry: title, type badge (colored by type), preview snippet (first 200 chars), date, tags
- Click entry to expand/edit inline
- Delete with confirmation
- Use `fetch("/api/knowledge")` for all operations
- All WSG brand styling: Schnyder headings, eyebrow labels, `--line` borders, `--surface-raised` backgrounds, `.wsg-btn-primary` and `.wsg-btn-ghost` buttons, no border-radius

User-facing type labels:
- `doc` → "Document"
- `note` → "Note"
- `case_study` → "Case Study"
- `email_sample` → "Winning Email"
- `transcript` → "Transcript"
- `brand` → "Brand Guide"

This is a `"use client"` page with state management. Use `useState` for the entries list, form state, editing state, and loading states. Fetch entries on mount with `useEffect`. Optimistic updates on create/delete.

---

## ACTION 2: INSTRUCTIONS/RULES MANAGEMENT PAGE

Build the full `/instructions` page with API routes for CRUD + active toggle. These rules get injected into every Claude prompt automatically.

### 2a. API Route: `src/app/api/instructions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const db = supabaseServer()
  const category = req.nextUrl.searchParams.get("category")

  let query = db.from("instructions").select("*").order("created_at", { ascending: false })
  if (category) query = query.eq("category", category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = supabaseServer()
  const body = await req.json()
  const { rule, category } = body

  if (!rule || !category) {
    return NextResponse.json({ error: "rule and category are required" }, { status: 400 })
  }

  const { data, error } = await db.from("instructions").insert({ rule, category, active: true }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

### 2b. API Route: `src/app/api/instructions/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseServer()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.rule !== undefined) update.rule = body.rule
  if (body.active !== undefined) update.active = body.active

  const { data, error } = await db.from("instructions").update(update).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseServer()
  const { error } = await db.from("instructions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

### 2c. Suppression import route: `src/app/api/suppression/import/route.ts`

**IMPORTANT:** The suppression table schema has separate `email` and `domain` columns (not `type`/`value`). Schema:
```sql
create table suppression (
  id uuid primary key default gen_random_uuid(),
  email text,
  domain text,
  reason text,
  created_at timestamptz default now()
);
create unique index on suppression(email) where email is not null;
```

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const db = supabaseServer()
  const body = await req.json()
  const { entries, entryType } = body // entryType: "email" | "domain"

  if (!entries || !Array.isArray(entries) || !entryType) {
    return NextResponse.json({ error: "entries array and entryType required" }, { status: 400 })
  }

  const cleaned = entries.map((e: string) => e.trim().toLowerCase()).filter(Boolean)
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid entries" }, { status: 400 })
  }

  const rows = cleaned.map((value: string) => ({
    [entryType]: value, // sets either "email" or "domain" column
    reason: "manual_import",
  }))

  const { error } = await db.from("suppression").insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: rows.length })
}
```

### 2d. Suppression list route: `src/app/api/suppression/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET() {
  const db = supabaseServer()
  const { data, error } = await db.from("suppression").select("*").order("created_at", { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

### 2e. Page: `src/app/instructions/page.tsx`

Replace the placeholder. Build a full page with:

- Four category sections, each with a header and description:
  - **Targeting Rules** (filter) — "Applied when generating search queries"
  - **Tone Rules** (tone) — "Applied when writing email sequences"
  - **Vocabulary Rules** (vocabulary) — "Words and phrases to use or avoid"
  - **Suppression Rules** (suppression) — "Domains and contacts to always exclude"
- Each section shows its rules in a list
- Each rule: text, active/inactive toggle (inline switch), edit button (inline), delete button
- Add new rule: inline form at bottom of each section (text input + "Add" button)
- Teaching empty state per section (e.g., "No targeting rules yet. Example: 'Never include companies under 50 employees'")
- A "Suppression List" section at the bottom:
  - Shows count of suppressed emails/domains
  - Textarea for bulk import (one per line)
  - Dropdown: "Emails" or "Domains"
  - "Import" button
  - List of existing suppressions with delete
- All WSG brand styling, `"use client"`, fetch-based CRUD

### 2f. Add new API routes to middleware

Update `src/middleware.ts` — add these routes to `isPublicRoute` if they need to be called from Inngest or external systems. For now they're behind Clerk auth which is fine since only Karl uses them.

**Actually — do NOT change middleware.** These routes are behind Clerk auth which is correct. Only the knowledge/instructions/suppression/settings API routes are called by the authenticated user from the browser.

---

## ACTION 3: SETTINGS PAGE WITH HEALTH CHECKS

### 3a. API Route: `src/app/api/settings/health/route.ts`

```typescript
import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

type ServiceCheck = {
  name: string
  status: "ok" | "error"
  message?: string
  latencyMs?: number
}

export async function GET() {
  const checks: ServiceCheck[] = []

  // Supabase
  const supaStart = Date.now()
  try {
    const db = supabaseServer()
    const { error } = await db.from("campaigns").select("id").limit(1)
    checks.push({
      name: "Supabase",
      status: error ? "error" : "ok",
      message: error?.message,
      latencyMs: Date.now() - supaStart,
    })
  } catch (e) {
    checks.push({ name: "Supabase", status: "error", message: String(e), latencyMs: Date.now() - supaStart })
  }

  // Anthropic
  const anthStart = Date.now()
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
    })
    checks.push({
      name: "Anthropic",
      status: res.ok ? "ok" : "error",
      message: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - anthStart,
    })
  } catch (e) {
    checks.push({ name: "Anthropic", status: "error", message: String(e), latencyMs: Date.now() - anthStart })
  }

  // LeadMagic
  const lmStart = Date.now()
  try {
    const res = await fetch(`${process.env.LEADMAGIC_BASE_URL || "https://api.leadmagic.io"}/api/v1/credits`, {
      headers: { "X-API-Key": process.env.LEADMAGIC_API_KEY || "" },
    })
    if (res.ok) {
      const data = await res.json()
      checks.push({
        name: "LeadMagic",
        status: "ok",
        message: `${data.credits ?? data.remaining ?? "?"} credits remaining`,
        latencyMs: Date.now() - lmStart,
      })
    } else {
      checks.push({ name: "LeadMagic", status: "error", message: `HTTP ${res.status}`, latencyMs: Date.now() - lmStart })
    }
  } catch (e) {
    checks.push({ name: "LeadMagic", status: "error", message: String(e), latencyMs: Date.now() - lmStart })
  }

  // Instantly
  const instStart = Date.now()
  try {
    const res = await fetch(`${process.env.INSTANTLY_BASE_URL || "https://api.instantly.ai"}/api/v2/campaigns?limit=1`, {
      headers: { Authorization: `Bearer ${process.env.INSTANTLY_API_KEY || ""}` },
    })
    checks.push({
      name: "Instantly",
      status: res.ok ? "ok" : "error",
      message: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - instStart,
    })
  } catch (e) {
    checks.push({ name: "Instantly", status: "error", message: String(e), latencyMs: Date.now() - instStart })
  }

  // Voyage
  const voyStart = Date.now()
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: process.env.VOYAGE_MODEL || "voyage-3", input: ["health check"], input_type: "document" }),
    })
    checks.push({
      name: "Voyage AI",
      status: res.ok ? "ok" : "error",
      message: res.ok ? undefined : `HTTP ${res.status}`,
      latencyMs: Date.now() - voyStart,
    })
  } catch (e) {
    checks.push({ name: "Voyage AI", status: "error", message: String(e), latencyMs: Date.now() - voyStart })
  }

  return NextResponse.json({ checks, checkedAt: new Date().toISOString() })
}
```

### 3b. Page: `src/app/settings/page.tsx`

Replace the placeholder. Build a settings page with:

- **Integration Health** section:
  - Grid of service cards (Supabase, Anthropic, LeadMagic, Instantly, Voyage AI)
  - Each card: service name, status indicator (green dot for ok, red for error), latency, message
  - "Check All" button that re-fetches `/api/settings/health`
  - Auto-check on page load
- **Environment Variables** section:
  - Show env var names (NOT values) with set/missing status
  - List: ANTHROPIC_API_KEY, VOYAGE_API_KEY, LEADMAGIC_API_KEY, INSTANTLY_API_KEY, SUPABASE_SERVICE_ROLE_KEY, GCP_SERVICE_ACCOUNT_JSON, INNGEST_EVENT_KEY
  - For each: green "Set" or red "Missing" badge
  - To check which are set, the health API can return this — add a `envStatus` field to the health response that checks `!!process.env.VAR_NAME` for each key
- WSG brand styling, `"use client"`, fetch-based

---

## ACTION 4: FINAL TYPECHECK + DEV SERVER TEST

After all actions complete:

1. Run `npx tsc --noEmit` — fix any TypeScript errors
2. Run `npm run dev` briefly to confirm no build errors
3. Verify the new API routes respond (curl or fetch them)

If the `embed` function import path is wrong, check `src/lib/voyage/embed.ts` for the actual export name and fix the import.

If any Supabase table columns don't match (e.g., `suppression` table might not have `type` + `value` + `reason` columns), check the actual schema with:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'suppression';
```
And adjust the API routes accordingly.

---

## STYLE RULES (apply to ALL new components)

1. **No border-radius** — ever. CSS has `border-radius: 0 !important` globally.
2. **Dark mode only** — all colors assume dark background `#050505`.
3. **Schnyder M** for headings (`font-family: var(--serif)`), **Neue Haas** for everything else (`font-family: var(--sans)`).
4. **Eyebrow labels** for section headers: `className="eyebrow"` or inline: `font-size: 0.72rem; font-weight: 500; letter-spacing: 0.32em; text-transform: uppercase; color: rgba(255,255,255,0.4)`.
5. **Dividers:** `<hr className="wsg-divider" />` or `border-top: 1px solid var(--line)`.
6. **Camel accent `#BE7B44`** for active states, focus rings, counts, highlights.
7. **Surface backgrounds:** `var(--surface-raised)` = `rgba(255,255,255,0.04)`.
8. **Buttons:** Use existing `.wsg-btn-primary`, `.wsg-btn-ghost`, `.wsg-btn-muted` classes.
9. **Inputs:** Bottom-border only (`border-bottom: 1px solid var(--line-strong)`), transparent background, camel on focus.
10. **No emojis, no icons library beyond lucide-react** (already installed).
11. **User-facing language:** Plain English, no jargon. "Contacts" not "leads", "Verified" not "enriched", "Reference Library" not "Knowledge Base".
12. **Generous spacing:** `clamp()` for padding, `mb-8` to `mb-16` between sections.
13. **Transitions:** `transition: all 0.35s ease` or `cubic-bezier(0.22, 1, 0.36, 1)` for animation.
