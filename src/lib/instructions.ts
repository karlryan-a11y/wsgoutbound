import { supabaseServer } from "@/lib/supabase/server"
import type { Instruction } from "@/types"

export async function getActiveInstructions(
  category?: string
): Promise<Instruction[]> {
  const db = supabaseServer()

  let query = db
    .from("instructions")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true })

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch instructions:", error)
    return []
  }

  return (data as Instruction[]) ?? []
}
