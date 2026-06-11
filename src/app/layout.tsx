import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import "./globals.css"

export const metadata: Metadata = {
  title: "WSG Outbound",
  description: "Watson Style Group — Outbound Campaign Manager",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "WSG Outbound",
    description: "Watson Style Group — Outbound Campaign Manager",
    images: [{ url: "/og-share.jpg", width: 1200, height: 630 }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/schnyder/Schnyder-MLight-Web.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/neue-haas/NHaasGroteskDSPro-45Lt.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/neue-haas/NHaasGroteskDSPro-55Rg.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <Header />
          <main className="relative flex min-h-[calc(100vh-96px)] flex-col">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
