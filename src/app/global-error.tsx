"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white text-[#0A0A0A]">
        <div className="text-center">
          <h2 className="mb-4 text-2xl">Something went wrong</h2>
          <button
            onClick={() => reset()}
            className="bg-[#0A0A0A] px-4 py-2 text-white hover:bg-[#BE7B44]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
