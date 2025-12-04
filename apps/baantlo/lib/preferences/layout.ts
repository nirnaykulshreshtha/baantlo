/**
 * @file layout.ts
 * @description Declares shared types, constants, and selectors for layout preference handling.
 * This module intentionally avoids server-only APIs so client components can import layout metadata.
 */

/**
 * Supported layout preference identifiers.
 */
export const LAYOUT_PREFERENCE_VALUES = ["vertical", "horizontal"] as const

export type LayoutPreference = (typeof LAYOUT_PREFERENCE_VALUES)[number]

/**
 * Name of the cookie storing the layout preference.
 */
export const LAYOUT_PREFERENCE_COOKIE = "baantlo_layout_preference"

/**
 * Default layout preference applied when the user has not selected an explicit option.
 */
export const DEFAULT_LAYOUT_PREFERENCE: LayoutPreference = "vertical"

/**
 * Options presented to the user when selecting a layout.
 */
export const layoutPreferenceOptions: Array<{
  value: LayoutPreference
  label: string
  description: string
}> = [
  {
    value: "vertical",
    label: "Sidebar",
    description: "Persistent navigation along the left edge.",
  },
  {
    value: "horizontal",
    label: "Top bar",
    description: "Two-tier horizontal navigation with global actions.",
  },
]

/**
 * Duration (in seconds) the layout preference cookie should persist.
 */
export const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days


