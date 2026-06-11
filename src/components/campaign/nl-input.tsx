"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const EXAMPLES = [
  "CFOs at mid-market companies in California",
  "Facilities directors at manufacturers in Texas",
  "VPs of Operations in the Southeast",
  "Estate managers at family offices in New York",
]

export function NLInput() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function handleSubmit() {
    if (!value.trim()) return
    const encoded = encodeURIComponent(value.trim())
    router.push(`/new?q=${encoded}`)
  }

  function handleChip(text: string) {
    setValue(text)
    const encoded = encodeURIComponent(text)
    router.push(`/new?q=${encoded}`)
  }

  return (
    <div>
      <div
        className="flex items-center gap-0"
        style={{ border: "1px solid var(--line-strong)" }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. CFOs at mid-market companies in California"
          style={{
            flex: 1,
            padding: "1.1rem 1.5rem",
            background: "transparent",
            border: "none",
            color: "var(--ink)",
            fontFamily: "var(--sans)",
            fontSize: "1rem",
            fontWeight: 300,
            outline: "none",
          }}
        />
        <button
          onClick={handleSubmit}
          className="shrink-0 transition-all duration-300"
          style={{
            padding: "1.1rem 2rem",
            background: value.trim() ? "var(--ink)" : "rgba(0, 0, 0,0.06)",
            color: value.trim() ? "var(--paper)" : "rgba(0, 0, 0,0.3)",
            fontFamily: "var(--sans)",
            fontSize: "0.74rem",
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            border: "none",
            cursor: value.trim() ? "pointer" : "default",
          }}
        >
          Start
        </button>
      </div>

      {/* Example chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => handleChip(ex)}
            className="transition-all duration-300"
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid var(--line)",
              background: "transparent",
              color: "rgba(0, 0, 0,0.4)",
              fontFamily: "var(--sans)",
              fontSize: "0.78rem",
              fontWeight: 300,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--wsg-camel)"
              e.currentTarget.style.color = "rgba(0, 0, 0,0.7)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)"
              e.currentTarget.style.color = "rgba(0, 0, 0,0.4)"
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Or go to full form */}
      <div className="mt-6">
        <button
          onClick={() => router.push("/new")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(0, 0, 0,0.3)",
            fontFamily: "var(--sans)",
            fontSize: "0.78rem",
            fontWeight: 300,
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          or use the full form
        </button>
      </div>
    </div>
  )
}
