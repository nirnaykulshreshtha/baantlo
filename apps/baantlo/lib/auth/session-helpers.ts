import "server-only"

/**
 * @file session-helpers.ts
 * @description Server-only helpers built on top of NextAuth's `auth()` helper.
 */

import { redirect } from "next/navigation"
import type { Session } from "next-auth"

import { auth } from "@/auth"
import {
  resolveDefaultRedirectPath,
  userHasAdminRole,
  userHasAnyPermission,
  userHasAnyRole,
  userHasAllPermissions,
  userHasPermission,
} from "./constants"

type RequireOptions = {
  redirectTo?: string
}

export async function getCurrentSession() {
  return auth()
}

export async function requireUser(options: RequireOptions = {}) {
  const session = await auth()
  if (!session?.user) {
    redirect(options.redirectTo ?? "/login")
  }
  return session
}

export async function requireAdmin(options: RequireOptions = {}) {
  const session = await requireUser(options)

  if (!userHasAdminRole(session.user as { role?: string | null; roles?: string[] | null })) {
    redirect(options.redirectTo ?? resolveDefaultRedirectPath(session.user))
  }

  return session
}

export async function getAccessToken() {
  const session = await auth()
  return session?.accessToken ?? null
}

export async function isUserVerified(session: Session | null) {
  if (!session?.user) return false
  return Boolean(session.user.email_verified || session.user.phone_verified)
}

type SessionUserAuthShape = {
  role?: string | null
  roles?: string[] | null
  permissions?: string[] | null
}

function assertAuthorization(
  session: Session,
  predicate: (user: SessionUserAuthShape | null | undefined) => boolean,
  options: RequireOptions
) {
  const isAuthorized = predicate(session.user as SessionUserAuthShape)
  if (!isAuthorized) {
    redirect(options.redirectTo ?? resolveDefaultRedirectPath(session.user))
  }
}

export async function requireRole(role: string, options: RequireOptions = {}) {
  const session = await requireUser(options)
  assertAuthorization(
    session,
    (user) => userHasAnyRole(user, [role]),
    options
  )
  return session
}

export async function requireAnyRole(
  roles: readonly string[],
  options: RequireOptions = {}
) {
  const session = await requireUser(options)
  assertAuthorization(session, (user) => userHasAnyRole(user, roles), options)
  return session
}

export async function requirePermission(
  permission: string,
  options: RequireOptions = {}
) {
  const session = await requireUser(options)
  assertAuthorization(
    session,
    (user) => userHasPermission(user, permission),
    options
  )
  return session
}

export async function requireAnyPermission(
  permissions: readonly string[],
  options: RequireOptions = {}
) {
  const session = await requireUser(options)
  assertAuthorization(
    session,
    (user) => userHasAnyPermission(user, permissions),
    options
  )
  return session
}

export async function requireAllPermissions(
  permissions: readonly string[],
  options: RequireOptions = {}
) {
  const session = await requireUser(options)
  assertAuthorization(
    session,
    (user) => userHasAllPermissions(user, permissions),
    options
  )
  return session
}
