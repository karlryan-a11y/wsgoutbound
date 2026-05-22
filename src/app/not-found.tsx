import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h2 className="mb-2 text-2xl">Page not found</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded bg-[#BE7B44] px-4 py-2 text-sm text-white hover:bg-[#A86A37]"
      >
        Back to campaigns
      </Link>
    </div>
  )
}
