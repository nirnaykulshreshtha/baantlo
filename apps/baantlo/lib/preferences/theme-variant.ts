/**
 * @file theme-variant.ts
 * @description Declares shared types, constants, and options for theme variant preference handling.
 */

/**
 * Supported theme variant identifiers.
 * Each variant represents a distinct color palette and styling approach.
 */
export const THEME_VARIANT_VALUES = ["default", "natural", "bubblegum", "majestic", "bourbon", "perpetuity", "brink"] as const

export type ThemeVariant = (typeof THEME_VARIANT_VALUES)[number]

/**
 * Name of the cookie storing the theme variant preference.
 */
export const THEME_VARIANT_COOKIE = "baantlo_theme_variant"

/**
 * Default theme variant applied when the user has not selected an explicit option.
 */
export const DEFAULT_THEME_VARIANT: ThemeVariant = "default"

/**
 * Options presented to the user when selecting a theme variant.
 */
export const themeVariantOptions: Array<{
  value: ThemeVariant
  label: string
  description: string
}> = [
  {
    value: "default",
    label: "Default",
    description: "Standard color palette with balanced contrast.",
  },
  {
    value: "natural",
    label: "Natural",
    description: "Earthy tones inspired by nature's palette.",
  },
  {
    value: "bubblegum",
    label: "Bubblegum",
    description: "Playful, vibrant colors with a fun twist.",
  },
  {
    value: "majestic",
    label: "Majestic",
    description: "Royal, elegant colors with a timeless touch.",
  },
  {
    value: "bourbon",
    label: "Bourbon",
    description: "Bourbon-inspired colors with a warm, inviting touch.",
  },
  {
    value: "perpetuity",
    label: "Perpetuity",
    description: "Perpetuity-inspired colors with a timeless, elegant touch.",
  },
  {
    value: "brink",
    label: "Brink",
    description: "Brink-inspired colors with a modern, vibrant touch.",
  },
]

/**
 * Duration (in seconds) the theme variant preference cookie should persist.
 */
export const THEME_VARIANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year


