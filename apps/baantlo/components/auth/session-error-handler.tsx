"use client"

/**
 * @file session-error-handler.tsx
 * @description Client component that monitors session errors and provides user-friendly
 * error handling when token refresh fails or session expires.
 * 
 * This component:
 * - Monitors session.error from NextAuth
 * - Displays toast notifications for authentication errors
 * - Automatically signs out and redirects users when session expires
 * - Provides clear messaging about what went wrong
 */

import { useEffect, useRef } from "react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

import { useAuthSession } from "@/hooks/use-auth-session"
import { AUTH_ERROR_MESSAGES, type AuthErrorCode } from "@/lib/auth/errors"
import { logLayoutEvent } from "@/lib/logging"

/**
 * Errors that require immediate sign out and redirect to login
 */
const CRITICAL_SESSION_ERRORS: AuthErrorCode[] = [
  "token_expired_or_revoked",
  "missing_refresh_token",
  "token_invalid",
  "missing_token",
]

/**
 * Gets a user-friendly error message for an error code.
 * 
 * @param errorCode - The error code from the session
 * @returns User-friendly error message
 */
function getErrorMessage(errorCode: string | null): string {
  if (!errorCode) return AUTH_ERROR_MESSAGES.error
  
  // Check if we have a message for this error code
  if (errorCode in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[errorCode as AuthErrorCode]
  }
  
  return AUTH_ERROR_MESSAGES.error
}

/**
 * Determines if an error requires immediate sign out.
 * 
 * @param errorCode - The error code to check
 * @returns true if the error is critical and requires sign out
 */
function isCriticalError(errorCode: string | null): boolean {
  if (!errorCode) return false
  return CRITICAL_SESSION_ERRORS.includes(errorCode as AuthErrorCode)
}

/**
 * Session error handler component that monitors authentication errors
 * and provides appropriate user feedback.
 * 
 * This component should be placed inside SessionProvider to monitor session state.
 */
export function SessionErrorHandler() {
  const { error, isAuthenticated } = useAuthSession()
  const previousErrorRef = useRef<string | null>(null)
  const isSigningOutRef = useRef(false)

  useEffect(() => {
    // Only handle errors when authenticated (we don't want to show errors on login page)
    if (!isAuthenticated || !error) {
      previousErrorRef.current = error
      return
    }

    // Prevent duplicate handling of the same error
    if (previousErrorRef.current === error) {
      return
    }

    previousErrorRef.current = error

    const errorMessage = getErrorMessage(error)
    const isCritical = isCriticalError(error)

    logLayoutEvent("Auth", "session_error_detected", {
      errorCode: error,
      isCritical,
      message: errorMessage,
    })

    // Show toast notification
    if (isCritical) {
      toast.error("Session Expired", {
        description: errorMessage,
        duration: 5000,
        action: {
          label: "Sign In",
          onClick: () => {
            // Sign out will trigger redirect
            if (!isSigningOutRef.current) {
              isSigningOutRef.current = true
              signOut({ callbackUrl: "/login", redirect: true })
            }
          },
        },
      })

      // Automatically sign out after a short delay to allow user to see the message
      const signOutTimer = setTimeout(() => {
        if (!isSigningOutRef.current) {
          isSigningOutRef.current = true
          logLayoutEvent("Auth", "auto_signout", { reason: error })
          signOut({ callbackUrl: "/login", redirect: true })
        }
      }, 3000) // 3 second delay

      return () => {
        clearTimeout(signOutTimer)
      }
    } else {
      // Non-critical errors - just show a toast
      toast.error("Authentication Error", {
        description: errorMessage,
        duration: 5000,
      })
    }
  }, [error, isAuthenticated])

  // Reset sign out flag when error clears
  useEffect(() => {
    if (!error) {
      isSigningOutRef.current = false
    }
  }, [error])

  // This component doesn't render anything - it's just a side effect handler
  return null
}

