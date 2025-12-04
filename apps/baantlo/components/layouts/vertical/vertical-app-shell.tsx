/**
 * @file vertical-app-shell.tsx
 * @description Composes the sidebar-driven shell for screens that benefit from a vertical navigation paradigm.
 * Uses refactored components that share navigation data with horizontal layout.
 */

import type { ReactNode } from "react"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layouts/vertical/app-sidebar"
import { defaultNavigationData, getNavigationDiagnostics } from "@/lib/navigation"
import { logLayoutEvent } from "@/lib/logging"
import { SiteHeader } from "@/components/common/site-header"

/**
 * Props for VerticalAppShell component.
 */
export type VerticalAppShellProps = {
  /** Slot for the route-specific content region */
  children: ReactNode
  /** Optional custom navigation data (defaults to defaultNavigationData) */
  navigationData?: typeof defaultNavigationData
  /** Optional actions rendered in the top header bar. */
  headerActions?: ReactNode
}

/**
 * Wraps child content with a persistent sidebar navigation layout.
 * Uses shared navigation data and refactored components for consistency.
 *
 * @param props.children - Slot for the route-specific content region
 * @param props.navigationData - Optional custom navigation data
 */
export function VerticalAppShell({
  children,
  navigationData = defaultNavigationData,
  headerActions,
}: VerticalAppShellProps) {
  logLayoutEvent("VerticalAppShell", "render", getNavigationDiagnostics())

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader actions={headerActions} />
        <div className="flex flex-1">
          <AppSidebar navigationData={navigationData} />
          <SidebarInset>
            <main
              id="main-content"
              className="flex flex-1 flex-col gap-4 p-4 focus:outline-none"
              tabIndex={-1}
            >
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}


