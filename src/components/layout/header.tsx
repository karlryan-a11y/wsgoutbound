"use client"

import Link from "next/link"
import Image from "next/image"
import { UserButton } from "@clerk/nextjs"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logos/W_Icon_White.svg"
              alt="WSG"
              width={24}
              height={24}
              className="opacity-90"
            />
            <span className="text-sm font-medium tracking-wide text-foreground/70">
              OUTBOUND
            </span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Campaigns
            </Link>
            <Link
              href="/knowledge"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Knowledge
            </Link>
            <Link
              href="/instructions"
              className="text-muted-foreground transition-colors hover:text-foreground"
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
