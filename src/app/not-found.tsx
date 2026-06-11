import Link from "next/link"

export default function NotFound() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center"
      style={{ padding: "clamp(1.25rem, 5vw, 6rem)" }}
    >
      <h2
        className="mb-3"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(2rem, 3vw, 3rem)",
          fontWeight: 300,
        }}
      >
        Page not found
      </h2>
      <p
        className="mb-10"
        style={{
          fontSize: "0.92rem",
          color: "rgba(0, 0, 0,0.4)",
          fontWeight: 300,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="wsg-btn-ghost inline-block">
        Back to campaigns
      </Link>
    </div>
  )
}
