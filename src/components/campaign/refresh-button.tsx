"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RefreshButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      className="mt-4 border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
      onClick={() => router.refresh()}
    >
      Refresh
    </Button>
  )
}
