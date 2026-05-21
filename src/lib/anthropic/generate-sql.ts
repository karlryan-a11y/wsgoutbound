import { getAnthropicClient, DEFAULT_MODEL } from "./client"
import { BQ_SCHEMA } from "@/lib/bigquery/schema"
import { retrieveKnowledge } from "@/lib/rag/retrieve"
import { getActiveInstructions } from "@/lib/instructions"
import { supabaseServer } from "@/lib/supabase/server"
import type { CampaignBrief, SqlVersion } from "@/types"

export async function generateSql(
  brief: CampaignBrief,
  previousVersions?: SqlVersion[]
): Promise<{ sql: string; reasoning: string }> {
  const client = getAnthropicClient()

  // Retrieve relevant knowledge for context
  const knowledge = await retrieveKnowledge(brief.persona, {
    limit: 5,
    type: "doc",
  })

  // Get active filter instructions
  const instructions = await getActiveInstructions("filter")

  const feedbackContext = previousVersions?.length
    ? `\n\nPREVIOUS ATTEMPTS:\n${previousVersions
        .map(
          (v, i) =>
            `Version ${i + 1}:\nSQL: ${v.sql}\nReasoning: ${v.reasoning}${v.feedback ? `\nUser feedback: ${v.feedback}` : ""}`
        )
        .join("\n\n")}`
    : ""

  const system = `You are a BigQuery SQL writer for Watson Style Group's outbound email campaigns.

CONTEXT — BigQuery schema:
${BQ_SCHEMA}

${knowledge.length > 0 ? `CONTEXT — relevant knowledge:\n${knowledge.map((k) => `[${k.title}]\n${k.content}`).join("\n\n")}` : ""}

${instructions.length > 0 ? `RULES (always apply):\n${instructions.map((i) => `- ${i.rule}`).join("\n")}` : ""}
${feedbackContext}

Output JSON only: { "sql": "...", "reasoning": "..." }
Use standard BigQuery SQL. Always include LIMIT (default 1000 unless user specifies).
Prefer the linkedin_us table when the brief mentions industry or company size.
Prefer the people table when the brief focuses on title/seniority filtering.
Always filter for records with email IS NOT NULL when the goal is outbound.`

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: JSON.stringify(brief) }],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""

  // Log to debug table
  if (process.env.DEBUG_LOG_PROMPTS === "1") {
    const db = supabaseServer()
    await db.from("debug_log").insert({
      step: "generate_sql",
      prompt: system + "\n\n" + JSON.stringify(brief),
      response: text,
      model: DEFAULT_MODEL,
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
    })
  }

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse SQL generation response as JSON")
  }

  return JSON.parse(jsonMatch[0])
}

export async function refineSqlWithFeedback(
  brief: CampaignBrief,
  previousVersions: SqlVersion[],
  feedback: string
): Promise<{ sql: string; reasoning: string }> {
  // Add feedback to the latest version
  const versionsWithFeedback = [...previousVersions]
  if (versionsWithFeedback.length > 0) {
    versionsWithFeedback[versionsWithFeedback.length - 1] = {
      ...versionsWithFeedback[versionsWithFeedback.length - 1],
      feedback,
    }
  }

  return generateSql(brief, versionsWithFeedback)
}
