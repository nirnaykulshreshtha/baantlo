"use server"

/**
 * @file layout-actions.ts
 * @description Server-side helpers for reading and persisting layout preferences via cookies.
 * Composes the generic cookie preference factory to keep behavior consistent with other preferences.
 */

import {
  DEFAULT_LAYOUT_PREFERENCE,
  LAYOUT_COOKIE_MAX_AGE,
  LAYOUT_PREFERENCE_COOKIE,
  LAYOUT_PREFERENCE_VALUES,
  type LayoutPreference,
} from "./layout"
import { createCookiePreferenceHandlers } from "./internal/cookie-preference"

const { setPreference, getPreference } = createCookiePreferenceHandlers<LayoutPreference>({
  cookieName: LAYOUT_PREFERENCE_COOKIE,
  allowedValues: LAYOUT_PREFERENCE_VALUES,
  defaultValue: DEFAULT_LAYOUT_PREFERENCE,
  maxAge: LAYOUT_COOKIE_MAX_AGE,
})

/**
 * Persists the layout preference in a secure cookie so subsequent requests render the matching shell.
 *
 * @param preference - The preferred layout to store.
 */
export async function setLayoutPreference(preference: LayoutPreference): Promise<void> {
  await setPreference(preference)
}

/**
 * Reads the current layout preference from cookies.
 *
 * @returns The current layout preference, or the default if not set.
 */
export async function getLayoutPreference(): Promise<LayoutPreference> {
  return getPreference()
}


