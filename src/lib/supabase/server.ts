import { createClient } from "@supabase/supabase-js"

// Server-side Supabase client using service role key
// Use this in Server Actions, API routes, and Inngest functions
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !key) {
    throw new Error("Missing Supabase server env vars")
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
