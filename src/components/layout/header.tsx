"use client"

import Link from "next/link"
import Image from "next/image"
import { UserButton } from "@clerk/nextjs"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b transition-all duration-500"
      style={{
        borderColor: "var(--line)",
        background: "rgba(22, 18, 13, 0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto flex h-24 max-w-[1400px] items-center justify-between"
        style={{ padding: "0 clamp(1.25rem, 5vw, 6rem)" }}
      >
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/W_Icon_White.svg"
            alt="Watson Style Group"
            width={108}
            height={108}
            className="opacity-90 transition-opacity duration-300 hover:opacity-100"
          />
        </Link>

        {/* Nav links — centered, matching main site nav style */}
        <nav className="hidden items-center md:flex"
          style={{ gap: "clamp(1.25rem, 2.6vw, 3rem)" }}
        >
          <Link href="/" className="nav-link eyebrow !text-[0.74rem] !tracking-[0.22em] !text-white/80 transition-colors duration-300 hover:!text-white">
            Campaigns
          </Link>
          <Link href="/knowledge" className="nav-link eyebrow !text-[0.74rem] !tracking-[0.22em] !text-white/80 transition-colors duration-300 hover:!text-white">
            Knowledge
          </Link>
          <Link href="/instructions" className="nav-link eyebrow !text-[0.74rem] !tracking-[0.22em] !text-white/80 transition-colors duration-300 hover:!text-white">
            Rules
          </Link>
          <Link href="/settings" className="nav-link eyebrow !text-[0.74rem] !tracking-[0.22em] !text-white/80 transition-colors duration-300 hover:!text-white">
            Settings
          </Link>
        </nav>

        {/* CTA + User */}
        <div className="flex items-center gap-6">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
