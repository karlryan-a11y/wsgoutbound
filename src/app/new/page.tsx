"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createCampaign } from "./actions"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-[#BE7B44] p-6">
      <h2 className="mb-4 text-base font-medium text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await createCampaign(formData)

    if (result.ok) {
      router.push(`/c/${result.campaignId}`)
    } else {
      setLoading(false)
      alert(result.error)
    }
  }

  const inputClass =
    "border-white/20 bg-black/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-8 text-2xl tracking-tight text-white">
        New Campaign
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Basics">
          <div>
            <Label className="text-white/80">Campaign Name</Label>
            <Input
              name="name"
              placeholder="e.g. Family Offices CA Q1"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </Section>

        <Section title="Targeting">
          <div>
            <Label className="text-white/80">Target Persona</Label>
            <Textarea
              name="persona"
              placeholder="Describe who you're targeting — e.g. CFOs and VPs of Finance at mid-market companies in California"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-white/80">Include Titles (comma-separated)</Label>
            <Input
              name="titles_include"
              placeholder="CFO, VP Finance, Controller, Director of Finance"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-white/80">Exclude Titles (comma-separated, optional)</Label>
            <Input
              name="titles_exclude"
              placeholder="Intern, Student, Retired"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-white/80">Geographies (comma-separated)</Label>
            <Input
              name="geographies"
              placeholder="California, New York, Texas"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-white/80">Industries (comma-separated, optional)</Label>
            <Input
              name="industries"
              placeholder="Real Estate, Manufacturing, Healthcare"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </Section>

        <Section title="Messaging">
          <div>
            <Label className="text-white/80">Value Proposition</Label>
            <Textarea
              name="value_prop"
              placeholder="What's the value you're offering?"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-white/80">Call to Action</Label>
            <Input
              name="cta"
              placeholder="e.g. 15-minute call to review your utility spend"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          <div>
            <Label className="text-white/80">Tone</Label>
            <Select name="tone" defaultValue="consultative">
              <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="luxury_formal">Luxury Formal</SelectItem>
                <SelectItem value="consultative">Consultative</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/80">Sequence Length</Label>
            <Select name="sequence_length" defaultValue="5">
              <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 emails</SelectItem>
                <SelectItem value="5">5 emails</SelectItem>
                <SelectItem value="7">7 emails</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/80">Instantly Campaign ID</Label>
            <Input
              name="instantly_campaign_id"
              placeholder="Paste from Instantly"
              required
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </Section>

        <Button
          type="submit"
          className="w-full bg-[#BE7B44] text-white hover:bg-[#A86A37]"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Campaign & Generate Query"}
        </Button>
      </form>
    </div>
  )
}
