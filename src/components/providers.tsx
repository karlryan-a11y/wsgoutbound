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
          colorBackground: "#231C16",
          colorInputBackground: "#2A2118",
          colorText: "#FFFFFF",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
