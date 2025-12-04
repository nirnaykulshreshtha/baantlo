/**
 * @file layout.tsx
 * @description Route-group layout deferring to the global shell selection. No additional chrome is applied here.
 */

import type { ReactNode } from "react"

import { HorizontalAppShell, VerticalAppShell } from "@/components/layouts"

import { requireUser } from "@/lib/auth/session-helpers"
import { getLayoutPreference } from "@/lib/preferences/layout-actions"
import { createNavigationDataFromSession } from "@/lib/navigation"

/**
 * Applies global shell selection; the root layout already wraps with the chosen shell.
 */
export default async function UserLayout({ children }: { children: ReactNode }) {
  const session = await requireUser()

  const layoutPreference = await getLayoutPreference()
  const navigationData = createNavigationDataFromSession(session)

  const shell =
    layoutPreference === "horizontal" ? (
      <HorizontalAppShell navigationData={navigationData}>
        {children}
      </HorizontalAppShell>
    ) : (
      <VerticalAppShell navigationData={navigationData}>
        {children}
      </VerticalAppShell>
    )

  return <>{shell}</>
}
