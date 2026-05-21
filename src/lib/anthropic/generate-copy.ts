import { getAnthropicClient, DEFAULT_MODEL } from "./client"
import { retrieveKnowledge } from "@/lib/rag/retrieve"
import { getActiveInstructions } from "@/lib/instructions"
import { supabaseServer } from "@/lib/supabase/server"
import type { CampaignBrief, MasterCopy, Lead, LeadPersonalization } from "@/types"

export async function generateMasterCopy(
  brief: CampaignBrief,
  sampleLeads: Record<string, unknown>[]
): Promise<MasterCopy> {
  const client = getAnthropicClient()

  const knowledge = await retrieveKnowledge(
    `${brief.value_prop} ${brief.persona} email sequence`,
    { limit: 5 }
  )
  const toneInstructions = await getActiveInstructions("tone")
  const vocabInstructions = await getActiveInstructions("vocabulary")

  const system = `You are the email copywriter for Watson Style Group. You write outbound email sequences.

BRAND VOICE:
- Luxury editorial aesthetic
- Consultative, not salesy
- Confident but never pushy
- Show expertise through specificity, not claims

${knowledge.length > 0 ? `REFERENCE MATERIAL:\n${knowledge.map((k) => `[${k.title}]\n${k.content}`).join("\n\n")}` : ""}

${toneInstructions.length > 0 ? `TONE RULES:\n${toneInstructions.map((i) => `- ${i.rule}`).join("\n")}` : ""}
${vocabInstructions.length > 0 ? `VOCABULARY RULES:\n${vocabInstructions.map((i) => `- ${i.rule}`).join("\n")}` : ""}

Write a ${brief.sequence_length}-step email sequence.
Output JSON only: { "steps": [{ "subject": "...", "body": "...", "delay_days": N }] }
Use {{first_name}}, {{company_name}}, {{first_line}}, and {{company_note}} as personalization tokens.
Step 1 delay_days should be 0. Subsequent steps typically 2-3 days apart.`

  const userContent = JSON.stringify({
    value_prop: brief.value_prop,
    proof_points: brief.proof_points,
    cta: brief.cta,
    persona: brief.persona,
    tone: brief.tone,
    sample_lead_profiles: sampleLeads.slice(0, 3),
  })

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 3000,
    system,
    messages: [{ role: "user", content: userContent }],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""

  if (process.env.DEBUG_LOG_PROMPTS === "1") {
    const db = supabaseServer()
    await db.from("debug_log").insert({
      step: "generate_master_copy",
      prompt: system + "\n\n" + userContent,
      response: text,
      model: DEFAULT_MODEL,
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
    })
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse copy generation response as JSON")
  }

  return JSON.parse(jsonMatch[0])
}

export async function generatePersonalization(
  brief: CampaignBrief,
  lead: Lead
): Promise<LeadPersonalization> {
  const client = getAnthropicClient()

  const system = `You personalize outbound emails for Watson Style Group.
Your job: write a first_line and company_note for this lead. Nothing more.
- first_line: 1 sentence opener that references something specific about the person
- company_note: 1 sentence about their company that ties to our value prop
Be specific, not generic. No flattery. Reference real details from their profile.
Output JSON only: { "first_line": "...", "company_note": "..." }`

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 300,
    system,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          lead_data: lead.source_data,
          value_prop: brief.value_prop,
        }),
      },
    ],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse personalization response as JSON")
  }

  return JSON.parse(jsonMatch[0])
}
