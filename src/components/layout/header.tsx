"use client"

import Link from "next/link"
import Image from "next/image"
import { UserButton } from "@clerk/nextjs"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#BE7B44]/10 bg-[#1A1410]/90 backdrop-blur-sm">
      <div className="container flex h-16 max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logos/W_Icon_White.svg"
              alt="WSG"
              width={40}
              height={40}
            />
            <span className="text-sm font-medium tracking-[0.2em] text-white/60">
              OUTBOUND
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <Link
              href="/"
              className="text-white/50 transition-colors hover:text-white"
            >
              Campaigns
            </Link>
            <Link
              href="/knowledge"
              className="text-white/50 transition-colors hover:text-white"
            >
              Knowledge
            </Link>
            <Link
              href="/instructions"
              className="text-white/50 transition-colors hover:text-white"
            >
              Rules
            </Link>
          </nav>
        </div>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  )
}
