import { createClient } from "@supabase/supabase-js"

// Client-side Supabase client using anon key
// Use this in React components for realtime subscriptions and reads
export function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!url || !key) {
    throw new Error("Missing Supabase client env vars")
  }

  return createClient(url, key)
}
