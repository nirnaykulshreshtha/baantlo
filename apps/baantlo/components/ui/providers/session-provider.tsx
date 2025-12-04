"use client"

import * as React from "react"
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

import { SessionErrorHandler } from "@/components/auth/session-error-handler"

/**
 * @file session-provider.tsx
 * @description Client component wrapper for NextAuth SessionProvider.
 * Required for Next.js 16+ App Router compatibility as SessionProvider must be a client component.
 * 
 * This provider also includes SessionErrorHandler to monitor and handle authentication errors.
 */

export function SessionProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextAuthSessionProvider>) {
  return (
    <NextAuthSessionProvider {...props}>
      <SessionErrorHandler />
      {children}
    </NextAuthSessionProvider>
  )
}

