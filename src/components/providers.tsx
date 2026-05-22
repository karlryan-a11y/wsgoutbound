"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#BE7B44",
          colorBackground: "#0A0A0A",
          colorInputBackground: "#1A1A1A",
          colorText: "#FFFFFF",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
