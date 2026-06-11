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
