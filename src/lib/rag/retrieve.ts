import { embed } from "@/lib/voyage/embed"
import { supabaseServer } from "@/lib/supabase/server"

type KnowledgeResult = {
  id: string
  title: string
  content: string
  type: string
  similarity: number
}

export async function retrieveKnowledge(
  query: string,
  opts: { limit?: number; type?: string } = {}
): Promise<KnowledgeResult[]> {
  try {
    const [embedding] = await embed([query])
    const supabase = supabaseServer()

    const { data, error } = await supabase.rpc("match_knowledge", {
      query_embedding: embedding,
      match_count: opts.limit ?? 5,
      filter_type: opts.type ?? null,
    })

    if (error) {
      console.error("RAG retrieval error:", error)
      return []
    }

    return (data as KnowledgeResult[]) ?? []
  } catch (err) {
    // RAG is non-critical — if it fails, continue without context
    console.error("RAG retrieval failed:", err)
    return []
  }
}
