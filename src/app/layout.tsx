import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "WSG Outbound",
  description: "Watson Style Group — Outbound Campaign Manager",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <Header />
          <main className="relative flex min-h-[calc(100vh-3.5rem)] flex-col">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
