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

  // Retrieve relevant knowledge for context (non-blocking)
  let knowledge: Awaited<ReturnType<typeof retrieveKnowledge>> = []
  try {
    knowledge = await retrieveKnowledge(brief.persona, {
      limit: 5,
      type: "doc",
    })
  } catch (e) {
    console.error("[generate-sql] knowledge retrieval failed:", e)
  }

  // Get active filter instructions (non-blocking)
  let instructions: Awaited<ReturnType<typeof getActiveInstructions>> = []
  try {
    instructions = await getActiveInstructions("filter")
  } catch (e) {
    console.error("[generate-sql] instructions retrieval failed:", e)
  }

  const feedbackContext = previousVersions?.length
    ? `\n\nPREVIOUS ATTEMPTS:\n${previousVersions
        .map(
          (v, i) =>
            `Version ${i + 1}:\nSQL: ${v.sql}\nReasoning: ${v.reasoning}${v.feedback ? `\nUser feedback: ${v.feedback}` : ""}`
        )
        .join("\n\n")}`
    : ""

  const system = `You are a BigQuery SQL writer for Watson Style Group's outbound email campaigns.

CRITICAL RULE — the apollo data is stored ENTIRELY LOWERCASE. Every string filter MUST normalize case or it will silently match ZERO rows:
- Use LOWER(column) LIKE '%lowercase_value%' for contains matches.
- Use LOWER(column) = 'lowercase_value' for equality (literal must be lowercase).
- This applies to EVERY string column — country, state, city, company_name, job_title, industry, etc.
- A capitalized literal like location_country = 'United States' is a BUG and returns nothing.

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

Use standard BigQuery SQL. Do NOT add a LIMIT clause to "sql" — the system controls row limits and counts the true total itself. (The "excluded_sql" should still use LIMIT 10.)
Prefer the linkedin_us table when the brief mentions industry, company size, or gender.
Prefer the people table when the brief focuses on title/seniority filtering.
Always filter for records with a non-empty email column when the goal is outbound (linkedin_us: emails IS NOT NULL AND emails != ''; people: person_email IS NOT NULL AND person_email != '').

GENDER: the brief may include a "gender" field. If it is "female" or "male", add a filter LOWER(gender) = '<value>' — this column ONLY exists on linkedin_us, so use that table when a gender filter is requested. If gender is "any", null, or absent, do NOT filter on gender.`

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
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

  // Log raw response for debugging
  const db2 = supabaseServer()
  await db2.from("debug_log").insert({
    step: "generate_sql_raw",
    prompt: `Response length: ${text.length}, stop_reason: ${response.stop_reason}`,
    response: text.slice(0, 4000),
    model: DEFAULT_MODEL,
    tokens_in: response.usage.input_tokens,
    tokens_out: response.usage.output_tokens,
  })

  // If response was truncated, throw a clear error
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      `SQL generation response truncated (max_tokens reached). Output was ${text.length} chars. Increase max_tokens.`
    )
  }

  // Parse JSON from response — handle markdown code blocks
  let jsonText = text
  // Strip markdown code fences if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1]
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(
      `Failed to parse SQL generation response as JSON. Response (first 500 chars): ${text.slice(0, 500)}`
    )
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
