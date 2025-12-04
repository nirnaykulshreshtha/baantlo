/**
 * @file layout.tsx
 * @description Root layout enabling global layout switching between vertical and horizontal shells.
 */

import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/ui/providers/theme-providers"
import { SessionProvider } from "@/components/ui/providers/session-provider"
import { Toaster } from "@/components/ui/sonner"
import { getThemePreference } from "@/lib/preferences/theme-actions"
import { getThemeVariantPreference } from "@/lib/preferences/theme-variant-actions"
import { getAllFontVariables } from "@/lib/fonts"
import "./globals.css"

export const metadata: Metadata = {
  title: "Baant Lo - Split Expenses Effortlessly",
  description: "The easiest way to split bills, track shared expenses, and settle up with friends. Free forever.",
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const themePreference = await getThemePreference()
  const themeVariantPreference = await getThemeVariantPreference()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme-variant={themeVariantPreference}
      className={`${getAllFontVariables()} font-sans antialiased`}
    >
      <head />
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme={themePreference}
          enableSystem={themePreference === "system"}
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
