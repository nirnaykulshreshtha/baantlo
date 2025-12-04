/**
 * @file layout.tsx
 * @description Route-group layout for settings pages, wiring the shared SettingsShell with
 * the preconfigured navigation dataset.
 */

import type { ReactNode } from "react"

import { SettingsShell } from "@/components/layouts/settings/settings-shell"

/**
 * Applies the settings shell to all nested segments.
 */
export default function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SettingsShell
      sidebarTitle="Settings overview"
      sidebarDescription=""
    >
      {children}
    </SettingsShell>
  )
}


