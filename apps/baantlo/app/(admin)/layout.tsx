/**
 * @file layout.tsx
 * @description Admin route-group layout enforcing authentication and role checks.
 */

import type { ReactNode } from "react"

import { VerticalAppShell } from "@/components/layouts"
import { requireAdmin } from "@/lib/auth/session-helpers"
import { createNavigationDataFromSession } from "@/lib/navigation"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin()
  const navigationData = createNavigationDataFromSession(session)

  return <VerticalAppShell navigationData={navigationData}>{children}</VerticalAppShell>
}
