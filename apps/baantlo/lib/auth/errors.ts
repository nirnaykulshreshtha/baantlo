/**
 * @file errors.ts
 * @description Normalized error helpers shared across authentication flows.
 */

export const AUTH_ERROR_MESSAGES = {
  invalid_credentials:
    "Invalid email or password. Please check your credentials and try again.",
  email_not_verified:
    "Please verify your email address before logging in. Check your inbox for a verification link.",
  phone_not_verified:
    "Please verify your phone number before logging in. Check your phone for the latest code.",
  rate_limited: "Too many attempts. Please wait a few minutes before trying again.",
  user_not_found: "No account found with this email address. Please register first.",
  invalid_otp: "That verification code did not match. Try again with the latest code.",
  constraint_violation: "The information provided is not valid. Review and try again.",
  email_in_use: "That email address is already connected to an account.",
  phone_in_use: "That phone number is already connected to an account.",
  token_invalid: "The token provided is invalid or expired. Please request a new one.",
  token_expired_or_revoked: "Your session has expired. Please log in again.",
  missing_refresh_token: "Refresh token is missing. Please log in again.",
  missing_token: "Authentication token missing. Log in to continue.",
  missing_client_id: "Client ID is required to continue.",
  invalid_id_token: "Unable to validate identity token. Try again.",
  database_error: "We ran into a temporary issue. Please try again shortly.",
  internal_error: "An internal server error occurred. Please try again or contact support if the issue persists.",
  error: "An unexpected error occurred. Please try again.",
} as const

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES

export type AuthErrorPayload = {
  code: AuthErrorCode
  message: string
  status?: number
  detail?: unknown
}

/**
 * Custom error type so consumers can branch on `.code`.
 */
export class AuthClientError extends Error {
  code: AuthErrorCode
  status?: number
  detail?: unknown

  constructor(payload: AuthErrorPayload) {
    super(payload.message)
    this.name = "AuthClientError"
    this.code = payload.code
    this.status = payload.status
    this.detail = payload.detail
  }
}

/**
 * Factory that builds an {@link AuthClientError} from the backend payload.
 * Ensures a message is always provided, falling back to the default error message if needed.
 */
export function createAuthClientError(
  code: AuthErrorCode = "error",
  overrides: Partial<Omit<AuthErrorPayload, "code">> = {}
): AuthClientError {
  // Ensure code is valid (fallback to "error" if somehow invalid)
  const validCode: AuthErrorCode = code in AUTH_ERROR_MESSAGES ? code : "error"
  
  // Always ensure we have a message - use override, then code-specific message, then default
  const message = 
    overrides.message?.trim() || 
    AUTH_ERROR_MESSAGES[validCode] || 
    AUTH_ERROR_MESSAGES.error
  
  return new AuthClientError({
    code: validCode,
    message,
    status: overrides.status,
    detail: overrides.detail,
  })
}

/**
 * Utility for mapping unknown errors (network/request) to a predictable payload.
 * Preserves original error details for debugging and provides context-aware messages.
 * 
 * @param error - The unknown error to resolve
 * @param context - Optional context about where the error occurred (e.g., URL, method)
 * @returns AuthClientError with preserved error details
 */
export function resolveAuthError(
  error: unknown,
  context?: { url?: string; method?: string }
): AuthClientError {
  if (error instanceof AuthClientError) {
    return error
  }

  if (error instanceof Error) {
    // Detect common network error patterns
    const errorMessage = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()
    
    // Check for connection refused errors
    const isConnectionError =
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("connection refused") ||
      errorMessage.includes("networkerror") ||
      errorName.includes("networkerror") ||
      errorMessage.includes("failed to fetch") ||
      errorMessage.includes("network request failed")

    // Check for timeout errors
    const isTimeoutError =
      errorMessage.includes("timeout") ||
      errorMessage.includes("etimedout") ||
      errorMessage.includes("aborted")

    // Build contextual message
    let message = error.message || AUTH_ERROR_MESSAGES.error
    
    if (isConnectionError) {
      const backendUrl = context?.url
        ? ` (${context.url})`
        : ""
      
      // Check if this might be a Docker networking issue
      const urlHost = context?.url ? new URL(context.url).hostname : null
      const isLocalhost = urlHost === "localhost" || urlHost === "127.0.0.1"
      const isDockerService = urlHost && !urlHost.includes(".") && urlHost !== "localhost" && urlHost !== "127.0.0.1"
      
      let dockerHint = ""
      if (isLocalhost) {
        dockerHint = " If you're running in Docker, use the service name (e.g., http://backend:8000) instead of localhost."
      } else if (isDockerService) {
        dockerHint = " Ensure the backend service is running and accessible in the Docker network."
      }
      
      message = `Unable to connect to the authentication service${backendUrl}. Please ensure the backend server is running and accessible.${dockerHint}`
    } else if (isTimeoutError) {
      message = "Request to the authentication service timed out. Please try again."
    }

    // Preserve full error details for debugging
    const errorDetail = {
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as Error & { cause?: unknown }).cause,
      },
      context,
    }

    return new AuthClientError({
      code: "error",
      message,
      detail: errorDetail,
    })
  }

  return new AuthClientError({
    code: "error",
    message: AUTH_ERROR_MESSAGES.error,
    detail: {
      originalError: error,
      context,
    },
  })
}
