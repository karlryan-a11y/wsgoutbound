"use client"

import { ClerkProvider } from "@clerk/nextjs"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0A0A0A",
          colorBackground: "#FFFFFF",
          colorInputBackground: "#FFFFFF",
          colorText: "#0A0A0A",
          colorTextSecondary: "#6B6B6B",
          colorInputText: "#0A0A0A",
          fontFamily: '"Neue Haas Grotesk", "Helvetica Neue", Arial, sans-serif',
          borderRadius: "0px",
        },
        elements: {
          card: "shadow-none border border-black/10",
          formButtonPrimary: "bg-[#0A0A0A] hover:bg-[#BE7B44] text-white",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
