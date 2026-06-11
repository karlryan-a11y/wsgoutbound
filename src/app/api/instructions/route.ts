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
