"use server"

/**
 * @file theme-variant-actions.ts
 * @description Server-side helpers for reading and persisting theme variant preferences via cookies.
 */

import {
  DEFAULT_THEME_VARIANT,
  THEME_VARIANT_COOKIE,
  THEME_VARIANT_COOKIE_MAX_AGE,
  THEME_VARIANT_VALUES,
  type ThemeVariant,
} from "./theme-variant"
import { createCookiePreferenceHandlers } from "./internal/cookie-preference"

const { setPreference, getPreference } = createCookiePreferenceHandlers<ThemeVariant>({
  cookieName: THEME_VARIANT_COOKIE,
  allowedValues: THEME_VARIANT_VALUES,
  defaultValue: DEFAULT_THEME_VARIANT,
  maxAge: THEME_VARIANT_COOKIE_MAX_AGE,
})

/**
 * Persists the theme variant preference in a secure cookie so subsequent requests render the matching variant.
 *
 * @param variant - The preferred theme variant to store.
 */
export async function setThemeVariantPreference(variant: ThemeVariant): Promise<void> {
  await setPreference(variant)
}

/**
 * Reads the current theme variant preference from cookies.
 *
 * @returns The current theme variant preference, or the default if not set.
 */
export async function getThemeVariantPreference(): Promise<ThemeVariant> {
  return getPreference()
}


