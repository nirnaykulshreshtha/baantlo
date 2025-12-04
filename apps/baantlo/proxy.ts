/**
 * @file proxy.ts
 * @description Next.js 16 proxy (formerly middleware) for authentication and authorization.
 * Migrated from middleware.ts to follow Next.js 16 conventions.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Session } from "next-auth"

import { auth } from "@/auth"
import {
  AUTH_LOGIN_PATH,
  AUTH_PROTECTED_PATH_PREFIXES,
  AUTH_PUBLIC_PATHS,
  isAdminRoutePath,
  resolveDefaultRedirectPath,
  userHasAdminRole,
} from "@/lib/auth/constants"

export default auth((req) => handleAuthProxy(req))

/**
 * Type for request with auth property added by NextAuth wrapper
 */
type RequestWithAuth = NextRequest & {
  auth: Session | null
}

/**
 * Handles authentication and authorization logic for incoming requests.
 * 
 * @param req - The incoming Next.js request with auth property added by NextAuth
 * @returns NextResponse with appropriate redirects or continuation
 */
function handleAuthProxy(req: RequestWithAuth) {
  const { pathname, origin } = req.nextUrl
  const session = req.auth

  const isPublicAuthPath = AUTH_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  const requiresAuthentication = AUTH_PROTECTED_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  const isAdminRoute = isAdminRoutePath(pathname)

  if (!session?.user) {
    if (requiresAuthentication || isAdminRoute) {
      const loginUrl = new URL(AUTH_LOGIN_PATH, origin)
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.href)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Redirect authenticated users away from the auth pages
  if (isPublicAuthPath) {
    const defaultRedirectPath = resolveDefaultRedirectPath(session.user)
    return NextResponse.redirect(new URL(defaultRedirectPath, origin))
  }

  if (isAdminRoute) {
    if (!userHasAdminRole(session.user as { role?: string | null; roles?: string[] | null })) {
      const defaultRedirectPath = resolveDefaultRedirectPath(session.user)
      return NextResponse.redirect(new URL(defaultRedirectPath, origin))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
}
