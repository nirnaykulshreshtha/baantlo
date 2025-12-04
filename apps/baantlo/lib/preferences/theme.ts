/**
 * @file theme.ts
 * @description Declares shared types, constants, and selection options for theme preference handling.
 * Designed for safe consumption by both client and server components.
 */

/**
 * Supported theme preference identifiers.
 */
export const THEME_PREFERENCE_VALUES = ["light", "dark", "system"] as const

export type ThemePreference = (typeof THEME_PREFERENCE_VALUES)[number]

/**
 * Name of the cookie storing the theme preference.
 */
export const THEME_PREFERENCE_COOKIE = "baantlo_theme_preference"

/**
 * Default theme preference applied when the user has not selected an explicit option.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system"

/**
 * Options presented to the user when selecting a theme.
 */
export const themePreferenceOptions: Array<{
  value: ThemePreference
  label: string
  description: string
}> = [
  {
    value: "light",
    label: "Light",
    description: "Light theme for bright environments.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dark theme for low-light environments.",
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device's theme preference.",
  },
]

/**
 * Duration (in seconds) the theme preference cookie should persist.
 */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year


