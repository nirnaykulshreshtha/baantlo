/**
 * @file token-refresh.ts
 * @description Helper utilities for refreshing JWTs issued by the FastAPI backend.
 * 
 * This module implements token refresh deduplication to prevent race conditions when
 * multiple concurrent requests attempt to refresh the same token simultaneously.
 * 
 * Key features:
 * - Token-specific deduplication: Tracks in-flight refreshes by refresh token value
 * - Automatic token rotation: Handles backend refresh token rotation gracefully
 * - Race condition prevention: Ensures only one refresh per token happens at a time
 */

import "server-only"

import { TOKEN_REFRESH_BUFFER_SECONDS } from "./constants"
import { createAuthClientError, resolveAuthError } from "./errors"
import { refreshSession } from "./api-client"
import { AuthSession } from "./types"
import { logLayoutEvent } from "@/lib/logging"

type RefreshResult = {
  accessToken: string
  refreshToken: string
  accessTokenExpires: number
  refreshTokenExpires?: number
  session: AuthSession
}

type GlobalAuthState = typeof globalThis & {
  __authInFlightRefreshes?: Map<string, Promise<RefreshResult>>
  __authRefreshCache?: Map<string, { result: RefreshResult; expiresAt: number }>
}

const globalAuthState = globalThis as GlobalAuthState

/**
 * Map tracking in-flight refresh operations by refresh token.
 * Stored on `globalThis` to survive Fast Refresh and per-request module reloads.
 */
const inFlightRefreshes =
  globalAuthState.__authInFlightRefreshes ??
  (globalAuthState.__authInFlightRefreshes = new Map<string, Promise<RefreshResult>>())

/**
 * Cache of recently completed refreshes to handle rapid successive calls.
 * Stored on `globalThis` for the same reason as `inFlightRefreshes`.
 */
const refreshCache =
  globalAuthState.__authRefreshCache ??
  (globalAuthState.__authRefreshCache = new Map<
    string,
    { result: RefreshResult; expiresAt: number }
  >())

/**
 * Cache TTL: 5 seconds - enough to handle rapid concurrent requests but not so long
 * that stale tokens linger in memory.
 */
const CACHE_TTL_MS = 5000

function getCachedResult(
  refreshToken: string,
  options: { logHit?: boolean } = {}
): RefreshResult | undefined {
  const cached = refreshCache.get(refreshToken)
  if (!cached) {
    return undefined
  }

  if (cached.expiresAt <= Date.now()) {
    refreshCache.delete(refreshToken)
    return undefined
  }

  if (options.logHit ?? true) {
    logLayoutEvent("Auth", "refresh_cache_hit", {})
  }

  return cached.result
}

function cacheRefreshResult(originalRefreshToken: string, result: RefreshResult) {
  const expiresAt = Date.now() + CACHE_TTL_MS

  refreshCache.set(originalRefreshToken, {
    result,
    expiresAt,
  })

  refreshCache.set(result.refreshToken, {
    result,
    expiresAt,
  })
}

/**
 * Checks if an access token is expiring soon and needs refresh.
 * 
 * @param expiresAt - Token expiration timestamp in milliseconds
 * @returns true if token expires within the refresh buffer window
 */
export function isAccessTokenExpiring(expiresAt?: number | null) {
  if (!expiresAt) return true
  const now = Date.now()
  return expiresAt - now <= TOKEN_REFRESH_BUFFER_SECONDS * 1000
}

/**
 * Refreshes an access token using a refresh token.
 * 
 * This function implements deduplication to prevent race conditions:
 * - If a refresh is already in-flight for the same token, waits for that result
 * - If a refresh was recently completed, returns the cached result
 * - Only initiates a new refresh if none is in progress
 * 
 * @param refreshToken - The refresh token to use for obtaining a new access token
 * @returns Promise resolving to new tokens and session information
 * @throws AuthClientError if refresh fails
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  if (!refreshToken) {
    throw createAuthClientError("missing_refresh_token")
  }

  // Check cache first - if we recently refreshed this token, return cached result
  const cached = getCachedResult(refreshToken)
  if (cached) {
    return cached
  }

  // Check if a refresh is already in-flight for this token
  const inFlight = inFlightRefreshes.get(refreshToken)
  if (inFlight) {
    logLayoutEvent("Auth", "refresh_deduplicated", {})
    return inFlight
  }

  let resolveRefresh!: (value: RefreshResult) => void
  let rejectRefresh!: (reason?: unknown) => void

  const refreshPromise = new Promise<RefreshResult>((resolve, reject) => {
    resolveRefresh = resolve
    rejectRefresh = reject
  })

  inFlightRefreshes.set(refreshToken, refreshPromise)
  logLayoutEvent("Auth", "refresh_inflight_set", { hasRefreshToken: Boolean(refreshToken) })

  void (async () => {
    try {
      const result = await performRefresh(refreshToken)
      logLayoutEvent("Auth", "refresh_result_ready", {
        refreshTokenRotated: result.refreshToken !== refreshToken,
      })
      cacheRefreshResult(refreshToken, result)
      resolveRefresh(result)
    } catch (error) {
      const resolved = resolveAuthError(error)

      if (resolved.code === "token_expired_or_revoked") {
        const recovered = getCachedResult(refreshToken, { logHit: false })
        if (recovered) {
          logLayoutEvent("Auth", "refresh_cache_recovered", { hasCachedResult: true })
          cacheRefreshResult(refreshToken, recovered)
          resolveRefresh(recovered)
          return
        }
      }

      logLayoutEvent("Auth", "refresh_failure", {
        code: resolved.code,
        message: resolved.message,
      })
      rejectRefresh(resolved)
    } finally {
      inFlightRefreshes.delete(refreshToken)
      cleanupCache()
    }
  })()

  return refreshPromise
}

/**
 * Performs the actual refresh request to the backend.
 * 
 * @param refreshToken - The refresh token to send to the backend
 * @returns Promise resolving to new tokens and session
 * @throws AuthClientError if the refresh fails
 */
async function performRefresh(refreshToken: string): Promise<RefreshResult> {
  logLayoutEvent("Auth", "refresh_start", { hasRefreshToken: Boolean(refreshToken) })
  try {
    const response = await refreshSession(refreshToken)

    if (response.action !== "issue_tokens" || !response.session) {
      throw createAuthClientError("token_invalid", {
        message: "Unexpected refresh response received from backend.",
        detail: response,
      })
    }

    const session = response.session
    const accessTokenExpires = Date.now() + session.expires_in * 1000

    logLayoutEvent("Auth", "refresh_success", {
      accessTokenExpires,
      refreshExpiresIn: session.refresh_expires_in,
    })

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      accessTokenExpires,
      refreshTokenExpires: session.refresh_expires_in
        ? Date.now() + session.refresh_expires_in * 1000
        : undefined,
      session,
    }
  } catch (error) {
    throw resolveAuthError(error)
  }
}

/**
 * Cleans up expired entries from the refresh cache.
 * This prevents memory leaks from stale cache entries.
 */
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of refreshCache.entries()) {
    if (value.expiresAt <= now) {
      refreshCache.delete(key)
    }
  }
}
