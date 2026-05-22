import { getAnthropicClient, DEFAULT_MODEL } from "./client"
import { BQ_SCHEMA } from "@/lib/bigquery/schema"
import { retrieveKnowledge } from "@/lib/rag/retrieve"
import { getActiveInstructions } from "@/lib/instructions"
import { supabaseServer } from "@/lib/supabase/server"
import type { CampaignBrief, SqlVersion } from "@/types"

export async function generateSql(
  brief: CampaignBrief,
  previousVersions?: SqlVersion[]
): Promise<{
  sql: string
  reasoning: string
  criteria: { included: string[]; excluded: string[] }
  excluded_sql: string
}> {
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

Output JSON only with this structure:
{
  "sql": "SELECT ... FROM ... WHERE ... LIMIT ...",
  "reasoning": "Brief explanation of the approach",
  "criteria": {
    "included": [
      "Plain English descriptions of each inclusion filter, e.g. 'People with job titles matching estate manager, house manager, or household manager'",
      "Another inclusion criterion"
    ],
    "excluded": [
      "Plain English descriptions of each exclusion filter, e.g. 'Records without an email address'",
      "Another exclusion criterion"
    ]
  },
  "excluded_sql": "A query that returns sample records that ALMOST matched but were excluded by the filters. Use the same base table but invert or relax one or two key filters. LIMIT 10."
}

The criteria arrays must describe every WHERE clause in plain, non-technical language that a non-SQL person can understand.
The excluded_sql should show interesting near-misses — records the user might want to include if they adjusted their criteria.

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

  const parsed = JSON.parse(jsonMatch[0])
  return {
    sql: parsed.sql,
    reasoning: parsed.reasoning,
    criteria: parsed.criteria ?? { included: [], excluded: [] },
    excluded_sql: parsed.excluded_sql ?? "",
  }
}

export async function refineSqlWithFeedback(
  brief: CampaignBrief,
  previousVersions: SqlVersion[],
  feedback: string
): Promise<{
  sql: string
  reasoning: string
  criteria: { included: string[]; excluded: string[] }
  excluded_sql: string
}> {
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
