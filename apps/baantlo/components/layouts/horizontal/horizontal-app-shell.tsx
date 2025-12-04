"use client"

/**
 * @file horizontal-app-shell.tsx
 * @description Implements a two-tiered horizontal navigation shell for pages that demand a horizontal layout experience.
 * Features a top bar with brand/logo and user menu, and a second tier with main navigation items.
 */

import type { ReactNode } from "react"

import { TopNavigation } from "@/components/layouts/top-navigation"
import { NavMain } from "@/components/common/nav-main"
import { NavUser } from "@/components/common/nav-user"
import { SidebarBrand } from "@/components/common/sidebar-brand"
import { DynamicBreadcrumbs } from "@/components/common/dynamic-breadcrumbs"
import {
  defaultNavigationData,
  getNavigationDiagnostics,
  primaryNavigation,
} from "@/lib/navigation"
import { logLayoutEvent } from "@/lib/logging"
import { cn } from "@/lib/utils"

/**
 * Props for HorizontalAppShell component.
 */
export type HorizontalAppShellProps = {
  /** Nested route segment rendered within the shell body */
  children: ReactNode
  /** Optional custom navigation data (defaults to defaultNavigationData) */
  navigationData?: typeof defaultNavigationData
  /** Optional actions rendered within the top bar */
  globalActions?: ReactNode
}

/**
 * Renders a two-tiered horizontal application shell:
 * - Tier 1: Brand/logo, primary navigation, and user menu
 * - Tier 2: Main navigation items with sub-menus
 *
 * @param props.children - Content to render within the shell
 * @param props.navigationData - Optional custom navigation data
 */
export function HorizontalAppShell({
  children,
  navigationData = defaultNavigationData,
  globalActions,
}: HorizontalAppShellProps) {
  logLayoutEvent("HorizontalAppShell", "render", getNavigationDiagnostics())

  return (
    <div className="flex min-h-screen flex-col">
      {/* Tier 1: Top bar with brand, primary nav, and user */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <div className="container mx-auto max-w-screen-2xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Brand/Logo */}
            <div className="flex flex-1 items-center gap-2">
              <SidebarBrand compact />
            </div>

            {/* Middle: Primary Navigation (TopNavigation) */}
            <div className="flex flex-1 items-center justify-center">
              {primaryNavigation && primaryNavigation.length > 0 && (
                <nav aria-label="Primary navigation">
                  <TopNavigation items={primaryNavigation} />
                </nav>
              )}
              {globalActions ? (
                <div className="flex items-center gap-2" aria-label="Global actions">
                  {globalActions}
                </div>
              ) : null}
            </div>

            {/* Right: User Menu */}
            <div className="flex flex-1 items-center justify-end gap-2">
              <NavUser user={navigationData.user} variant="horizontal" />
            </div>
          </div>
        </div>
      </header>

      {/* Tier 2: Secondary navigation bar with main nav items */}
      <nav
        className={cn(
          "sticky top-16 z-40 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/50"
        )}
        aria-label="Section navigation"
      >
        <div className="container mx-auto max-w-screen-2xl px-4 md:px-6">
          <div className="flex h-12 items-center">
            <NavMain
              items={navigationData.navMain}
              variant="horizontal"
              className="flex-1"
            />
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main
        id="main-content"
        className="flex-1 focus:outline-none"
        tabIndex={-1}
      >
        <div className="container mx-auto max-w-screen-2xl px-4 py-6 md:px-6">
          {/* Dynamic breadcrumbs positioned between navigation and content */}
          <DynamicBreadcrumbs className="mb-4" />
          {children}
        </div>
      </main>
    </div>
  )
}
