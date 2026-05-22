"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RefreshButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      className="mt-4 border-black/15 text-white/70 hover:bg-black/10 hover:text-white"
      onClick={() => router.refresh()}
    >
      Refresh
    </Button>
  )
}
