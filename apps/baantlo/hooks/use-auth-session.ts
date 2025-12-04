'use client'

/**
 * @file use-auth-session.ts
 * @description Typed wrapper around `useSession` tailored for the Baant Lo auth payload.
 */

import type { Session } from "next-auth"
import { useSession } from "next-auth/react"

export type AppSession = Session & {
  accessToken?: string | null
  refreshToken?: string | null
  accessTokenExpires?: number | null
  error?: string | null
}

export function useAuthSession() {
  const {
    data,
    status,
    update,
  } = useSession()

  return {
    session: data as AppSession | null,
    user: data?.user,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    error: data?.error ?? null,
    update,
  }
}
