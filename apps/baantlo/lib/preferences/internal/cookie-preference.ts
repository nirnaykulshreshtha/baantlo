/**
 * @file cookie-preference.ts
 * @description Provides a reusable factory for creating cookie-backed preference handlers.
 * The generated helpers enforce aggressive logging-friendly validation to keep client-side
 * imports lightweight while centralizing cookie semantics for all preference modules.
 */

import { cookies } from "next/headers"

/**
 * Configuration contract for the cookie-backed preference factory.
 */
export type CookiePreferenceConfig<TAllowed extends string> = {
  /** Fully qualified cookie name to read/write preference data. */
  cookieName: string
  /** Allowed enumerated values for validating incoming preference updates. */
  allowedValues: readonly TAllowed[]
  /** Default value returned when the cookie has not been set. */
  defaultValue: TAllowed
  /** Max-age directive (in seconds) supplied to the cookie store. */
  maxAge: number
  /** Optional path scoping for the cookie; defaults to application-wide root. */
  path?: string
  /** Optional SameSite policy; defaults to lax for authenticated UX. */
  sameSite?: "lax" | "strict" | "none"
}

/**
 * Return shape emitted by the preference factory.
 */
export type CookiePreferenceHandlers<TAllowed extends string> = {
  /** Writes the provided preference value to the configured cookie. */
  setPreference: (value: TAllowed) => Promise<void>
  /** Reads the preference cookie and resolves a validated value (falls back to default). */
  getPreference: () => Promise<TAllowed>
}

/**
 * Creates strongly-typed cookie preference helpers with consistent validation and defaults.
 *
 * @param config - Runtime configuration describing the cookie storage contract.
 * @returns Pair of `setPreference` and `getPreference` operations scoped to the cookie.
 */
export function createCookiePreferenceHandlers<TAllowed extends string>(
  config: CookiePreferenceConfig<TAllowed>
): CookiePreferenceHandlers<TAllowed> {
  const {
    cookieName,
    allowedValues,
    defaultValue,
    maxAge,
    path = "/",
    sameSite = "lax",
  } = config

  const allowed = new Set<TAllowed>(allowedValues)

  const validate = (value: TAllowed): void => {
    if (!allowed.has(value)) {
      throw new Error(`Unsupported preference value for ${cookieName}: ${value}`)
    }
  }

  async function setPreference(value: TAllowed): Promise<void> {
    validate(value)

    const cookieStore = await cookies()
    cookieStore.set(cookieName, value, {
      maxAge,
      path,
      sameSite,
    })
  }

  async function getPreference(): Promise<TAllowed> {
    const cookieStore = await cookies()
    const storedValue = cookieStore.get(cookieName)?.value as TAllowed | undefined

    if (storedValue && allowed.has(storedValue)) {
      return storedValue
    }

    return defaultValue
  }

  return {
    setPreference,
    getPreference,
  }
}


