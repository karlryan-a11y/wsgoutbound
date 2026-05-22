"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-8 text-2xl tracking-tight text-white">
        New Campaign
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Name */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white/70">Campaign Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Family Offices CA Q1"
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Targeting */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">Targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="persona" className="text-white/70">Target Persona</Label>
              <Textarea
                id="persona"
                name="persona"
                placeholder="Describe who you're targeting — e.g. CFOs and VPs of Finance at mid-market companies in California"
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="titles_include" className="text-white/70">
                Include Titles (comma-separated)
              </Label>
              <Input
                id="titles_include"
                name="titles_include"
                placeholder="CFO, VP Finance, Controller, Director of Finance"
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="titles_exclude" className="text-white/70">
                Exclude Titles (comma-separated, optional)
              </Label>
              <Input
                id="titles_exclude"
                name="titles_exclude"
                placeholder="Intern, Student, Retired"
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="geographies" className="text-white/70">
                Geographies (comma-separated)
              </Label>
              <Input
                id="geographies"
                name="geographies"
                placeholder="California, New York, Texas"
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="industries" className="text-white/70">
                Industries (comma-separated, optional)
              </Label>
              <Input
                id="industries"
                name="industries"
                placeholder="Real Estate, Manufacturing, Healthcare"
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Messaging */}
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">Messaging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="value_prop" className="text-white/70">Value Proposition</Label>
              <Textarea
                id="value_prop"
                name="value_prop"
                placeholder="What's the value you're offering? e.g. We find hidden savings in utility bills through rate and tariff analysis — contingency-based, so no savings = no fee."
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="cta" className="text-white/70">Call to Action</Label>
              <Input
                id="cta"
                name="cta"
                placeholder="e.g. 15-minute call to review your utility spend"
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="tone" className="text-white/70">Tone</Label>
              <Select name="tone" defaultValue="consultative">
                <SelectTrigger className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white">
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
              <Label htmlFor="sequence_length" className="text-white/70">Sequence Length</Label>
              <Select name="sequence_length" defaultValue="5">
                <SelectTrigger className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white">
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
              <Label htmlFor="instantly_campaign_id" className="text-white/70">
                Instantly Campaign ID
              </Label>
              <Input
                id="instantly_campaign_id"
                name="instantly_campaign_id"
                placeholder="Paste from Instantly"
                required
                className="mt-1.5 border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </div>
          </CardContent>
        </Card>

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
