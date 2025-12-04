"use server"

/**
 * @file theme-actions.ts
 * @description Server-side helpers for reading and persisting theme preferences via cookies.
 */

import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COOKIE_MAX_AGE,
  THEME_PREFERENCE_COOKIE,
  THEME_PREFERENCE_VALUES,
  type ThemePreference,
} from "./theme"
import { createCookiePreferenceHandlers } from "./internal/cookie-preference"

const { setPreference, getPreference } = createCookiePreferenceHandlers<ThemePreference>({
  cookieName: THEME_PREFERENCE_COOKIE,
  allowedValues: THEME_PREFERENCE_VALUES,
  defaultValue: DEFAULT_THEME_PREFERENCE,
  maxAge: THEME_COOKIE_MAX_AGE,
})

/**
 * Persists the theme preference in a secure cookie so subsequent requests render the matching theme.
 *
 * @param preference - The preferred theme to store.
 */
export async function setThemePreference(preference: ThemePreference): Promise<void> {
  await setPreference(preference)
}

/**
 * Reads the current theme preference from cookies.
 *
 * @returns The current theme preference, or the default if not set.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  return await getPreference()
}


