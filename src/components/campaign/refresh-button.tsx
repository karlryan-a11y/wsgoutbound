"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RefreshButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      className="mt-4 border-white/[0.1] text-white/60 hover:bg-white/[0.05] hover:text-white"
      onClick={() => router.refresh()}
    >
      Refresh
    </Button>
  )
}
