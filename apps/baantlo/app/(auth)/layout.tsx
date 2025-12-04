/**
 * @file layout.tsx
 * @description Route-group layout deferring to the global shell selection. No additional chrome is applied here.
 */

import type { ReactNode } from "react"

import AuthShell from "@/components/layouts/auth/auth-shell"
import { getThemeVariantPreference } from "@/lib/preferences/theme-variant-actions"

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const title = process.env.NEXT_PUBLIC_BRAND_NAME || "Baant Lo"
  const subtitle = process.env.NEXT_PUBLIC_BRAND_SUBTITLE || "Your trusted bill splitting app"
  const themeVariant = await getThemeVariantPreference()

  return (
    <AuthShell title={title} subtitle={subtitle} currentThemeVariant={themeVariant}>
      {children}
    </AuthShell>
  )
}
