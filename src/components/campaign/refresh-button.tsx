"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RefreshButton() {
  const router = useRouter()
  return (
    <Button variant="outline" className="mt-4" onClick={() => router.refresh()}>
      Refresh
    </Button>
  )
}
