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

import { z } from "zod"
import { publicApiRequest } from "@/lib/shared/public-api-request"

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
 * Zod schema for validating permissions configuration response.
 */
const PermissionsConfigSchema = z.object({
  platform_permissions: z.array(z.string()),
  group_permissions: z.array(z.string()),
  platform_roles: z.record(z.string(), z.array(z.string())),
  group_roles: z.record(z.string(), z.array(z.string())),
})

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
 * Gets the permissions API URL based on the environment.
 * Uses Next.js API route which proxies to the backend.
 * 
 * @returns The permissions API URL
 */
function getPermissionsApiUrl(): string {
  // Always use the Next.js API route (works on both server and client)
  return "/api/v1/auth/permissions"
}

/**
 * Fetches permissions from the Next.js API route (which proxies to backend).
 * Uses the requestPermissions function for type-safe, validated requests.
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
    const apiUrl = getPermissionsApiUrl()
    console.log(`[Permissions Service] Fetching permissions from: ${apiUrl}`)

    // Use the shared public API request function for type-safe, validated requests
    const data = await publicApiRequest(PermissionsConfigSchema, {
      url: apiUrl,
      errorMessage: "Failed to fetch permissions from backend",
      revalidate: 3600, // Revalidate every hour on server
    })

    // Update cache
    permissionsCache = data
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
 * Checks if the current request path is an auth route.
 * Auth routes don't need permissions, so we skip fetching.
 * 
 * @param pathname - The request pathname (optional, will try to detect if not provided)
 * @returns True if the path is an auth route
 */
function isAuthRoute(pathname?: string): boolean {
  // If pathname is provided, use it
  if (pathname) {
    return (
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/verify-") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password")
    )
  }

  // Client-side: check current pathname
  if (typeof window !== "undefined") {
    return isAuthRoute(window.location.pathname)
  }

  // Server-side: try to use Next.js headers if available
  try {
    // Dynamic import to avoid bundling in client
    const { headers } = require("next/headers")
    const headersList = headers()
    const pathname = headersList.get("x-pathname") || headersList.get("referer")?.split("?")[0] || ""
    if (pathname) {
      return isAuthRoute(pathname)
    }
  } catch {
    // headers() not available or not in request context
    // This is fine - we'll skip auto-init and fetch when needed
  }

  // Default: assume not an auth route (conservative approach)
  // Permissions will be fetched when actually needed
  return false
}

/**
 * Initializes permissions cache on server startup.
 * This is called automatically on server-side imports to warm up the cache.
 * Safe to call multiple times - it will only fetch if cache is empty or expired.
 * 
 * Skips initialization on auth routes since permissions aren't needed there.
 */
async function initializePermissions(): Promise<void> {
  // Only initialize on server-side
  if (typeof window !== "undefined") {
    return
  }

  // Skip initialization on auth routes
  if (isAuthRoute()) {
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

// Auto-initialize on server-side import (but skip on auth routes)
// Note: This is a best-effort - permissions will be fetched when actually needed
if (typeof window === "undefined") {
  // Fire and forget - don't block module loading
  // Only initialize if not on an auth route
  if (!isAuthRoute()) {
    initializePermissions().catch((error) => {
      console.error("[Permissions Service] Error during auto-initialization:", error)
    })
  }
}

