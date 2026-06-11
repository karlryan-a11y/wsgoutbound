import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const db = supabaseServer()
  const body = await req.json()
  const { entries, entryType } = body // entryType: "email" | "domain"

  if (!entries || !Array.isArray(entries) || !entryType) {
    return NextResponse.json({ error: "entries array and entryType required" }, { status: 400 })
  }

  if (entryType !== "email" && entryType !== "domain") {
    return NextResponse.json({ error: "entryType must be 'email' or 'domain'" }, { status: 400 })
  }
  const column: "email" | "domain" = entryType

  // Clean and de-duplicate within the submitted batch.
  const cleaned = Array.from(
    new Set(entries.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean))
  )
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid entries" }, { status: 400 })
  }

  // Skip values already suppressed. We can't rely on ON CONFLICT here: the unique
  // index on email is partial (`where email is not null`), which Postgres won't
  // match to an unqualified ON CONFLICT (email) target — so we filter manually.
  const { data: existing, error: lookupError } = await db
    .from("suppression")
    .select("email, domain")
    .in(column, cleaned)
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })

  const existingRows = (existing ?? []) as Array<{ email: string | null; domain: string | null }>
  const existingSet = new Set(
    existingRows.map((r) => r[column]).filter((v): v is string => Boolean(v))
  )
  const toInsert = cleaned.filter((v) => !existingSet.has(v))

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: cleaned.length })
  }

  const rows = toInsert.map((value: string) => ({
    [column]: value, // sets either "email" or "domain" column
    reason: "manual_import",
  }))

  const { error } = await db.from("suppression").insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: rows.length, skipped: cleaned.length - rows.length })
}
