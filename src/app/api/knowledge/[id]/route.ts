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
