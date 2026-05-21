"use server"

import { supabaseServer } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"
import type { CampaignBrief } from "@/types"

export async function createCampaign(
  formData: FormData
): Promise<{ ok: true; campaignId: string } | { ok: false; error: string }> {
  try {
    const name = formData.get("name") as string
    const persona = formData.get("persona") as string
    const titlesInclude = (formData.get("titles_include") as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const titlesExclude = (formData.get("titles_exclude") as string || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const geographies = (formData.get("geographies") as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const industries = (formData.get("industries") as string || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const brief: CampaignBrief = {
      persona,
      titles_include: titlesInclude,
      titles_exclude: titlesExclude.length > 0 ? titlesExclude : undefined,
      geographies,
      industries: industries.length > 0 ? industries : undefined,
      value_prop: formData.get("value_prop") as string,
      cta: formData.get("cta") as string,
      tone: (formData.get("tone") as CampaignBrief["tone"]) || "consultative",
      sequence_length:
        (parseInt(formData.get("sequence_length") as string) as 3 | 5 | 7) || 5,
      personalization_depth: "opener_plus_company",
      max_candidates: 1000,
      max_enrich: 200,
      validation_strictness: "valid_only",
      apply_default_suppression: true,
      instantly_campaign_id: formData.get("instantly_campaign_id") as string,
    }

    const db = supabaseServer()

    const { data, error } = await db
      .from("campaigns")
      .insert({
        name,
        status: "draft",
        brief,
      })
      .select("id")
      .single()

    if (error) throw error

    // Fire Inngest event to start the campaign workflow
    await inngest.send({
      name: "campaign/submitted",
      data: { campaignId: data.id },
    })

    return { ok: true, campaignId: data.id }
  } catch (err) {
    console.error("Failed to create campaign:", err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
