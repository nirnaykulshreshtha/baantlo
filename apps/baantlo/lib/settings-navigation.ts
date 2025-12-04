/**
 * @file settings-navigation.ts
 * @description Declares the structured navigation model for the settings workspace to ensure
 * consistent sidebar composition across components and route groups.
 */

/**
 * Represents a concrete navigable entry within a settings group.
 */
export type SettingsNavigationEntry = {
  /** Stable identifier used for analytics and testing hooks. */
  id: string
  /** Human-readable label presented to end users. */
  label: string
  /** Optional helper copy rendered beneath or alongside the label. */
  description?: string
  /** Absolute href consumed by Next.js routing helpers. */
  href: string
  /** Optional status indicator surfaced beside the label. */
  badge?: string
}

/**
 * Represents a logical grouping of settings entries. Groups render as titled sections within the sidebar.
 */
export type SettingsNavigationGroup = {
  /** Stable identifier for the group, useful when persisting expansion state. */
  id: string
  /** Label surfaced as the section headline. */
  label: string
  /** Concrete entries that belong to the group. */
  entries: SettingsNavigationEntry[]
}

/**
 * Default navigation blueprint for the settings experience.
 */
export const settingsNavigationGroups: SettingsNavigationGroup[] = [
  {
    id: "preferences",
    label: "Preferences",
    entries: [
      {
        id: "appearance",
        label: "Appearance",
        description: "Customize theme and layout preferences.",
        href: "/settings/appearance",
      },
    ],
  },
]

/**
 * Produces a flattened list of entries to simplify lookups without duplicating the data model.
 *
 * @param groups - Optional override dataset when testing variations of the sidebar.
 */
export function flattenSettingsNavigationEntries(
  groups: SettingsNavigationGroup[] = settingsNavigationGroups
): SettingsNavigationEntry[] {
  return groups.flatMap((group) => group.entries)
}

/**
 * Exposes diagnostics for aggressive logging and observability.
 *
 * @param groups - Optional override dataset to inspect.
 */
export function getSettingsNavigationDiagnostics(
  groups: SettingsNavigationGroup[] = settingsNavigationGroups
) {
  return {
    groupCount: groups.length,
    entryCount: groups.reduce((total, group) => total + group.entries.length, 0),
    groupIds: groups.map((group) => group.id),
  }
}


