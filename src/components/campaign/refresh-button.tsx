"use client"

import { useRouter } from "next/navigation"

export function RefreshButton() {
  const router = useRouter()
  return (
    <button
      className="wsg-btn-muted mt-8"
      onClick={() => router.refresh()}
    >
      Refresh
    </button>
  )
}
