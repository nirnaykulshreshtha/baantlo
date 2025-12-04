/**
 * @file permissions-service.ts
 * @description Service for fetching and caching permissions configuration dynamically from the backend.
 * 
 * This service provides a single source of truth for permissions by fetching them
 * from the backend API. It includes:
 * - Runtime fetching from Next.js API route
 * - Caching to minimize backend requests
 * - Fallback to default permissions if backend is unavailable
 * - Type-safe permission constants
 * - Auto-initialization on server-side import
 * 
 * The service ensures the frontend stays in sync with backend permission changes
 * without requiring a rebuild.
 */

/**
 * Type definition for the permissions configuration structure.
 */
export type PermissionsConfig = {
  platform_permissions: string[]
  group_permissions: string[]
  platform_roles: Record<string, string[]>
  group_roles: Record<string, string[]>
}

/**
 * Default permissions configuration used as fallback when backend is unavailable.
 * This should match the backend permissions.json structure.
 */
const DEFAULT_PERMISSIONS: PermissionsConfig = {
  platform_permissions: [
    "user.read.self",
    "user.update.self",
    "user.read.any",
    "user.manage",
    "group.create",
    "group.read.any",
    "group.update.any",
    "group.delete.any",
    "admin.full_access",
  ],
  group_permissions: [
    "group.read.own",
    "group.update.own",
    "group.delete.own",
    "group.invite",
    "group.member.add",
    "group.member.remove",
    "expense.create",
    "expense.read.group",
    "expense.update.own",
    "expense.delete.own",
    "expense.update.any",
    "expense.delete.any",
    "settlement.create",
    "settlement.read.group",
    "settlement.approve",
    "settlement.reject",
  ],
  platform_roles: {
    PLATFORM_ADMIN: [
      "user.read.self",
      "user.update.self",
      "group.create",
      "admin.full_access",
      "user.read.any",
      "user.manage",
      "group.read.any",
      "group.update.any",
      "group.delete.any",
    ],
    BASIC_USER: [
      "user.read.self",
      "user.update.self",
      "group.create",
    ],
  },
  group_roles: {
    owner: [
      "group.read.own",
      "group.update.own",
      "group.delete.own",
      "group.invite",
      "group.member.add",
      "group.member.remove",
      "expense.create",
      "expense.read.group",
      "expense.update.own",
      "expense.delete.own",
      "expense.update.any",
      "expense.delete.any",
      "settlement.create",
      "settlement.read.group",
      "settlement.approve",
      "settlement.reject",
    ],
    member: [
      "group.read.own",
      "expense.create",
      "expense.read.group",
      "expense.update.own",
      "expense.delete.own",
      "settlement.create",
      "settlement.read.group",
    ],
  },
}

/**
 * In-memory cache for permissions configuration.
 * Cache is invalidated after 1 hour (3600000ms).
 */
let permissionsCache: PermissionsConfig | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 3600000 // 1 hour

/**
 * Fetches permissions from the Next.js API route (which proxies to backend).
 * 
 * @param useCache - Whether to use cached permissions if available (default: true)
 * @returns Permissions configuration
 */
async function fetchPermissions(useCache: boolean = true): Promise<PermissionsConfig> {
  // Check cache first
  if (useCache && permissionsCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    console.log("[Permissions Service] Using cached permissions")
    return permissionsCache
  }

  try {
    // Determine the API URL based on environment
    const isServer = typeof window === "undefined"
    
    // Lazy import env only on server to avoid client-side issues
    let apiUrl: string
    if (isServer) {
      // Dynamic import to avoid bundling env.ts in client bundle
      const { env } = await import("@/lib/env")
      apiUrl = env.BACKEND_API_URL
        ? `${env.BACKEND_API_URL}/permissions`
        : "http://localhost:3000/api/v1/permissions"
    } else {
      // Client-side: use relative URL
      apiUrl = "/api/v1/permissions"
    }

    console.log(`[Permissions Service] Fetching permissions from: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // On server, use cache with revalidation
      ...(isServer && {
        next: {
          revalidate: 3600,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Validate response structure
    if (
      !data.platform_permissions ||
      !data.group_permissions ||
      !data.platform_roles ||
      !data.group_roles
    ) {
      throw new Error("Invalid permissions response structure")
    }

    // Update cache
    permissionsCache = data as PermissionsConfig
    cacheTimestamp = Date.now()

    console.log(
      `[Permissions Service] Successfully fetched permissions: ${data.platform_permissions.length} platform permissions, ${data.group_permissions.length} group permissions`
    )

    return permissionsCache
  } catch (error) {
    console.error("[Permissions Service] Error fetching permissions:", error)

    // If we have cached data, use it even if expired
    if (permissionsCache) {
      console.warn("[Permissions Service] Using expired cache due to fetch error")
      return permissionsCache
    }

    // Fallback to default permissions
    console.warn("[Permissions Service] Using default permissions as fallback")
    return DEFAULT_PERMISSIONS
  }
}

/**
 * Gets the current permissions configuration.
 * Fetches from backend if not cached, otherwise returns cached version.
 * 
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 * @returns Permissions configuration
 */
export async function getPermissions(forceRefresh: boolean = false): Promise<PermissionsConfig> {
  return fetchPermissions(!forceRefresh)
}

/**
 * Clears the permissions cache, forcing a fresh fetch on next call.
 */
export function clearPermissionsCache(): void {
  console.log("[Permissions Service] Clearing permissions cache")
  permissionsCache = null
  cacheTimestamp = 0
}

/**
 * Gets permissions synchronously if cached, otherwise returns default.
 * Use this only when you need immediate access and can accept default values.
 * 
 * @returns Cached permissions or default permissions
 */
export function getCachedPermissions(): PermissionsConfig {
  return permissionsCache || DEFAULT_PERMISSIONS
}

/**
 * Initializes permissions cache on server startup.
 * This is called automatically on server-side imports to warm up the cache.
 * Safe to call multiple times - it will only fetch if cache is empty or expired.
 */
async function initializePermissions(): Promise<void> {
  // Only initialize on server-side
  if (typeof window !== "undefined") {
    return
  }

  // If cache is fresh, skip initialization
  if (permissionsCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return
  }

  try {
    await fetchPermissions(false) // Force refresh
    console.log("[Permissions Service] Initialized permissions cache on server startup")
  } catch (error) {
    console.warn("[Permissions Service] Failed to initialize permissions cache:", error)
    // Fallback to defaults is handled in fetchPermissions
  }
}

// Auto-initialize on server-side import
if (typeof window === "undefined") {
  // Fire and forget - don't block module loading
  initializePermissions().catch((error) => {
    console.error("[Permissions Service] Error during auto-initialization:", error)
  })
}

