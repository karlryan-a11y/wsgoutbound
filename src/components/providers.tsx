"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#000000",
          colorBackground: "#BE7B44",
          colorInputBackground: "rgba(0, 0, 0, 0.15)",
          colorText: "#FFFFFF",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
