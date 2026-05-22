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
          colorBackground: "#141414",
          colorInputBackground: "#1E1E1E",
          colorText: "#F8E5E7",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
