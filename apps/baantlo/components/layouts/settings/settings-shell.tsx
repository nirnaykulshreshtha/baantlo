/**
 * @file settings-shell.tsx
 * @description Server component composing the settings experience with a dedicated secondary sidebar
 * and content region. Relies on shared navigation data to guarantee a single source of truth.
 */

import type { ReactNode } from "react"

import { SettingsSidebar } from "@/components/layouts/settings/settings-sidebar"
import { logLayoutEvent } from "@/lib/logging"
import {
  getSettingsNavigationDiagnostics,
  settingsNavigationGroups,
  type SettingsNavigationGroup,
} from "@/lib/settings-navigation"
import { cn } from "@/lib/utils"

/**
 * Props accepted by the SettingsShell component.
 */
export type SettingsShellProps = {
  /** Route content rendered within the layout. */
  children: ReactNode
  /** Optional override for navigation groups (useful for testing). */
  groups?: SettingsNavigationGroup[]
  /** Optional title surfaced in the secondary sidebar header. */
  sidebarTitle?: string
  /** Optional helper copy displayed beneath the sidebar title. */
  sidebarDescription?: string
  /** Tailwind className that augments the outer layout container. */
  className?: string
  /** Tailwind className injected into the content wrapper around children. */
  contentWrapperClassName?: string
}

/**
 * Renders the settings layout with a persistent secondary sidebar and a content canvas.
 */
export function SettingsShell({
  children,
  groups = settingsNavigationGroups,
  sidebarTitle,
  sidebarDescription,
  className,
  contentWrapperClassName,
}: SettingsShellProps) {
  logLayoutEvent("SettingsShell", "render", getSettingsNavigationDiagnostics(groups))

  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-4",
        className
      )}
    >
      <aside className="lg:w-72 xl:w-80">
        <SettingsSidebar
          groups={groups}
          title={sidebarTitle}
          description={sidebarDescription}
        />
      </aside>
      <main className="flex-1">
        <div
          className={cn(
            "space-y-6 rounded-2xl border bg-card p-6 shadow-sm",
            contentWrapperClassName
          )}
          data-slot="settings-content"
        >
          {children}
        </div>
      </main>
    </div>
  )
}


