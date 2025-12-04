/**
 * @file core.ts
 * @description Declares core navigation types and diagnostics helpers consumed by layout shells.
 */

import {
  HomeIcon,
  LayoutPanelLeftIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Represents a strongly typed navigation item consumed by application shells.
 */
export type AppNavigationItem = {
  /** Unique identifier used for analytics, keys, and acceptance tests. */
  id: string
  /** Label rendered to end users. */
  label: string
  /** Destination href respected by Next.js routing. */
  href: string
  /** Optional icon identifier used to resolve a Lucide component within client shells. */
  iconKey?: AppNavigationIconKey
  /** Flag to highlight the node as primary within the menu. */
  isPrimary?: boolean
}

/**
 * Icon keys available to layout navigation.
 */
export type AppNavigationIconKey = "home" | "horizontal" | "vertical" | "settings"

const navigationIconComponents: Record<AppNavigationIconKey, LucideIcon> = {
  home: HomeIcon,
  horizontal: LayoutPanelLeftIcon,
  vertical: SettingsIcon,
  settings: SettingsIcon,
}

/**
 * Resolves the Lucide icon component for a provided key.
 *
 * @param iconKey - Identifier describing the visual treatment to render.
 */
export function getNavigationIconComponent(iconKey?: AppNavigationIconKey) {
  return iconKey ? navigationIconComponents[iconKey] : undefined
}

/**
 * Declarative primary navigation entries that both horizontal and vertical shells consume.
 */
export const primaryNavigation: AppNavigationItem[] = []

/**
 * Utility to derive navigation analytics metadata for logging without replicating mapping logic throughout the codebase.
 *
 * @returns Minimal payload describing the navigation state for debug instrumentation.
 */
export function getNavigationDiagnostics() {
  return {
    totalRoutes: primaryNavigation.length,
    ids: primaryNavigation.map((item) => item.id),
  }
}


