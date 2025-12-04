/**
 * @file constants.ts
 * @description Centralized constants supporting client and server auth workflows.
 * 
 * This module dynamically loads permissions from the backend via the permissions service.
 * It provides synchronous access to permissions for use in middleware and other synchronous
 * contexts, falling back to default permissions if the backend is unavailable.
 * 
 * Permissions are cached and automatically synced with the backend.
 */

import { getCachedPermissions } from "./permissions-service"

/**
 * Gets the current permissions configuration.
 * Uses cached permissions if available, otherwise falls back to defaults.
 * This ensures synchronous access for middleware and other sync contexts.
 */
function getPermissionsConfig() {
  return getCachedPermissions()
}

// Initialize permissions config from cache/defaults
const PERMISSIONS_CONFIG = getPermissionsConfig()

export const PLATFORM_PERMISSIONS = [
  ...PERMISSIONS_CONFIG.platform_permissions,
] as const

export const GROUP_PERMISSIONS = [
  ...PERMISSIONS_CONFIG.group_permissions,
] as const

export const PLATFORM_ROLE_PERMISSIONS = PERMISSIONS_CONFIG.platform_roles as Record<
  string,
  readonly string[]
>
export const GROUP_ROLE_PERMISSIONS = PERMISSIONS_CONFIG.group_roles as Record<
  string,
  readonly string[]
>

export type PlatformRole = keyof typeof PLATFORM_ROLE_PERMISSIONS
export type GroupRole = keyof typeof GROUP_ROLE_PERMISSIONS

export const PLATFORM_ROLES = Object.keys(
  PLATFORM_ROLE_PERMISSIONS
) as PlatformRole[]

export const GROUP_ROLES = Object.keys(GROUP_ROLE_PERMISSIONS) as GroupRole[]

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number]
export type GroupPermission = (typeof GROUP_PERMISSIONS)[number]
export type AnyPermission = PlatformPermission | GroupPermission

/**
 * Base routes for authentication endpoints (relative paths).
 * These will be combined with BACKEND_API_URL to form full URLs.
 */
export const AUTH_BACKEND_ROUTES = {
  login: "/auth/login",
  token: "/auth/token",
  register: "/auth/register",
  requestEmailVerify: "/auth/request-email-verify",
  verifyEmail: "/auth/verify-email",
  requestEmailOtp: "/auth/request-email-otp",
  verifyEmailOtp: "/auth/verify-email-otp",
  requestPhoneOtp: "/auth/request-otp",
  verifyPhoneOtp: "/auth/verify-otp",
  forgotPassword: "/auth/forgot-password",
  validateResetToken: "/auth/validate-reset-token",
  resetPassword: "/auth/reset-password",
  refresh: "/auth/refresh",
  revoke: "/auth/revoke",
  changePassword: "/profile/change-password",
} as const

/**
 * Gets the backend API base URL, removing trailing slashes.
 * @returns The normalized backend API URL
 */
function getBackendBaseUrl(): string {
  // Import env at runtime to avoid circular dependencies during module initialization
  // This is safe because env is validated at startup
  const env = require("@/lib/env").env
  return env.BACKEND_API_URL.replace(/\/+$/, "")
}

/**
 * Constructs a full URL for an auth backend route by combining the base URL with the route path.
 * @param route - Relative route path from AUTH_BACKEND_ROUTES
 * @returns Full URL combining BACKEND_API_URL with the route
 */
export function getAuthBackendUrl(route: string): string {
  const baseUrl = getBackendBaseUrl()
  // Ensure route starts with /
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`
  // Remove any trailing slashes from baseUrl to avoid double slashes
  const baseUrlNormalized = baseUrl.replace(/\/+$/, "")
  return `${baseUrlNormalized}${normalizedRoute}`
}

export const AUTH_HEADER_JSON = { "Content-Type": "application/json" }

export const TOKEN_REFRESH_BUFFER_SECONDS = 45

export const ADMIN_ROLES = ["PLATFORM_ADMIN"] as const
export const ADMIN_PERMISSIONS = ["admin.full_access"] as const

export const AUTH_PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-otp",
  "/verify-phone",
] as const

export const AUTH_LOGIN_PATH = "/login"
export const AUTH_DEFAULT_REDIRECT = "/dashboard"

export const AUTH_PROTECTED_PATH_PREFIXES = ["/settings", "/dashboard", "/app"] as const
export const AUTH_ADMIN_PATH_PREFIXES = ["/admin"] as const

type MaybeUserRoleShape = {
  role?: string | null
  roles?: string[] | null
  permissions?: string[] | null
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const result = new Set<string>()
  for (const entry of value) {
    if (typeof entry === "string") {
      const trimmed = entry.trim()
      if (trimmed.length > 0) {
        result.add(trimmed)
      }
    }
  }
  return [...result]
}

function collectUserRoles(user: MaybeUserRoleShape | null | undefined): string[] {
  if (!user) {
    return []
  }

  const roles = new Set<string>()
  if (typeof user.role === "string" && user.role.trim().length > 0) {
    roles.add(user.role.trim())
  }

  for (const role of normalizeStringList(user.roles)) {
    roles.add(role)
  }

  return [...roles]
}

export function getUserRoles(
  user: MaybeUserRoleShape | null | undefined
): string[] {
  return collectUserRoles(user)
}

function collectUserPermissions(
  user: MaybeUserRoleShape | null | undefined
): string[] {
  if (!user) {
    return []
  }

  const permissions = new Set<string>(normalizeStringList(user.permissions))
  const rolePermissions = getPermissionsConfig().platform_roles
  
  for (const role of collectUserRoles(user)) {
    if (role in rolePermissions) {
      for (const permission of rolePermissions[role]) {
        permissions.add(permission)
      }
    }
  }
  return [...permissions]
}

export function getUserPermissions(
  user: MaybeUserRoleShape | null | undefined
): string[] {
  return collectUserPermissions(user)
}

export function userHasRole(
  user: MaybeUserRoleShape | null | undefined,
  role: string
): boolean {
  if (!role) {
    return false
  }

  const normalizedRole = role.trim()
  if (!normalizedRole) {
    return false
  }

  return collectUserRoles(user).includes(normalizedRole)
}

export function userHasAnyRole(
  user: MaybeUserRoleShape | null | undefined,
  roles: readonly string[]
): boolean {
  if (!roles.length) {
    return false
  }

  const userRoles = new Set(collectUserRoles(user))
  return roles.some((role) => userRoles.has(role))
}

export function userHasPermission(
  user: MaybeUserRoleShape | null | undefined,
  permission: string
): boolean {
  if (!permission) {
    return false
  }

  const normalizedPermission = permission.trim()
  if (!normalizedPermission) {
    return false
  }

  return collectUserPermissions(user).includes(normalizedPermission)
}

export function userHasAnyPermission(
  user: MaybeUserRoleShape | null | undefined,
  permissions: readonly string[]
): boolean {
  if (!permissions.length) {
    return false
  }

  const permissionSet = new Set(collectUserPermissions(user))
  return permissions.some((permission) => permissionSet.has(permission))
}

export function userHasAllRoles(
  user: MaybeUserRoleShape | null | undefined,
  roles: readonly string[]
): boolean {
  if (!roles.length) {
    return false
  }

  const roleSet = new Set(collectUserRoles(user))
  for (const role of roles) {
    if (!roleSet.has(role)) {
      return false
    }
  }
  return true
}

export function userHasAllPermissions(
  user: MaybeUserRoleShape | null | undefined,
  permissions: readonly string[]
): boolean {
  if (!permissions.length) {
    return false
  }

  const permissionSet = new Set(collectUserPermissions(user))
  for (const permission of permissions) {
    if (!permissionSet.has(permission)) {
      return false
    }
  }
  return true
}

/**
 * Determines whether the provided user payload has any admin-level role.
 */
export function userHasAdminRole(user?: MaybeUserRoleShape | null): boolean {
  if (userHasAnyPermission(user, ADMIN_PERMISSIONS)) {
    return true
  }

  return userHasAnyRole(user, ADMIN_ROLES)
}

/**
 * Resolves the default post-auth redirect path for the given user.
 */
export function resolveDefaultRedirectPath(
  user?: MaybeUserRoleShape | null
): string {
  return userHasAdminRole(user) ? "/admin/dashboard" : AUTH_DEFAULT_REDIRECT
}

function pathMatchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isAdminRoutePath(pathname: string): boolean {
  return pathMatchesPrefix(pathname, AUTH_ADMIN_PATH_PREFIXES)
}
