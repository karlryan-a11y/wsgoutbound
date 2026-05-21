import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { runCampaign } from "@/inngest/functions/run-campaign"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runCampaign],
})
