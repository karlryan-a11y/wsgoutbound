"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#F8E5E7]">
        <div className="text-center">
          <h2 className="mb-4 text-2xl">Something went wrong</h2>
          <button
            onClick={() => reset()}
            className="rounded bg-[#BE7B44] px-4 py-2 text-white hover:bg-[#A86A37]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
