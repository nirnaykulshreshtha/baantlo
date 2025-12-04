/**
 * @file api-client.ts
 * @description Strongly typed client for communicating with the FastAPI authentication backend.
 * All functions in this module are server-only to avoid leaking secrets to the browser.
 */

"use server"

import { z } from "zod"

import { env } from "@/lib/env"
import { AUTH_BACKEND_ROUTES, AUTH_HEADER_JSON, getAuthBackendUrl } from "./constants"
import {
  AuthClientError,
  AuthErrorCode,
  AUTH_ERROR_MESSAGES,
  createAuthClientError,
  resolveAuthError,
} from "./errors"
import {
  AuthSessionSchema,
  ChangePasswordResponseSchema,
  EmailVerificationRequestSchema,
  ForgotPasswordResponseSchema,
  LoginResponseSchema,
  PasswordResetValidationSchema,
  PhoneVerificationRequestSchema,
  ResetPasswordResponseSchema,
  TokenRefreshResponseSchema,
  VerificationFlowSchema,
} from "./types"

const jsonHeaders = AUTH_HEADER_JSON

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1).max(64),
  phone: z.string().min(10).max(15).optional(),
  preferred_currency: z.string().length(3).optional(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(8),
  new_password: z.string().min(8),
})

const changePasswordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string().min(8),
})

const otpRequestSchema = z.object({
  phone: z.string().min(10).max(15),
})

const otpVerifySchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().min(4).max(6),
})

const emailOtpSchema = z.object({
  email: z.string().email(),
})

const emailOtpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(6),
})

type ZodSchema<T> = z.ZodType<T>

/**
 * Makes a typed HTTP request to the authentication backend.
 * Handles network errors, API errors, and response validation.
 * 
 * @param path - API endpoint path (e.g., "/auth/login")
 * @param init - Fetch request options (method, body, headers, etc.)
 * @param schema - Zod schema to validate the response
 * @returns Parsed and validated response data
 * @throws AuthClientError with detailed error information
 */
async function request<T>(
  path: string,
  init: RequestInit,
  schema: ZodSchema<T>
): Promise<T> {
  // Use BACKEND_API_URL directly instead of proxy
  // Construct full URL from route path
  const url = getAuthBackendUrl(path)
  
  console.log("[Auth API Client] Using direct backend URL:", url)
  
  const method = init.method || "GET"

  // Log request (sanitize sensitive data)
  const hasBody = !!init.body
  const bodyPreview = hasBody
    ? typeof init.body === "string"
      ? init.body.length > 100
        ? `${init.body.substring(0, 100)}... (${init.body.length} chars)`
        : init.body
      : "[Object]"
    : undefined

  console.log("[API Client] Request:", {
    method,
    path,
    baseUrl: env.BACKEND_API_URL,
    fullUrl: url,
    hasBody: !!hasBody,
  })

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...jsonHeaders,
        ...(init.headers ?? {}),
      },
    })

    const contentType = response.headers.get("content-type")
    const isJson = contentType?.includes("application/json")
    
    let payload: unknown
    try {
      payload = isJson ? await response.json() : await response.text()
    } catch (parseError) {
      throw createAuthClientError("error", {
        status: response.status,
        detail: {
          parseError,
          contentType,
          statusText: response.statusText,
        },
        message: "Failed to parse response from the authentication service.",
      })
    }

    if (!response.ok) {
      console.error("[API Client] Request failed:", {
        method,
        url: url,
        status: response.status,
        statusText: response.statusText,
        path,
        baseUrl: env.BACKEND_API_URL,
      })

      let code: AuthErrorCode = "error"
      let message: string | undefined

      // Map HTTP status codes to error codes
      if (response.status === 404) {
        code = "user_not_found"
        message = `The requested resource was not found at ${url}. Please verify the backend URL and endpoint path.`
      } else if (response.status === 401) {
        code = "invalid_credentials"
      } else if (response.status === 429) {
        code = "rate_limited"
      } else if (response.status === 500) {
        code = "internal_error"
      } else if (response.status >= 500) {
        code = "internal_error"
      }

      if (payload && typeof payload === "object") {
        const payloadObj = payload as Record<string, unknown>
        
        // Extract error code from payload, but validate it's a valid AuthErrorCode
        const rawCode =
          payloadObj.error_code ??
          payloadObj.detail ??
          payloadObj.error
        if (typeof rawCode === "string") {
          // Only use the code if it's a valid AuthErrorCode
          if (rawCode in AUTH_ERROR_MESSAGES) {
            code = rawCode as AuthErrorCode
          } else {
            // If it's not a valid code, use it as a message instead
            if (!message) {
              message = rawCode
            }
          }
        }
        
        // Extract error message from payload if available
        const rawMessage = payloadObj.message
        if (typeof rawMessage === "string" && rawMessage.trim()) {
          message = rawMessage
        }
      }

      throw createAuthClientError(code, {
        status: response.status,
        detail: payload,
        message, // Use message from API if available, otherwise fall back to default
      })
    }

    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      throw createAuthClientError("error", {
        detail: {
          validationErrors: parsed.error.flatten(),
          rawPayload: payload,
        },
        message: "Unexpected response received from the authentication service.",
      })
    }

    console.log("[API Client] Success:", {
      url: url,
      method,
    })

    return parsed.data
  } catch (error) {
    // Resolve error with context for better debugging
    throw resolveAuthError(error, {
      url: url,
      method,
    })
  }
}

export async function login(input: z.infer<typeof loginRequestSchema>) {
  const payload = loginRequestSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.login,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    LoginResponseSchema
  )
}

export async function issueTokens(
  input: z.infer<typeof loginRequestSchema>
) {
  const payload = loginRequestSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    VerificationFlowSchema
  )
}

export async function register(
  input: z.infer<typeof registerRequestSchema>
) {
  const payload = registerRequestSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.register,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    VerificationFlowSchema
  )
}

export async function requestEmailVerification(
  input: z.infer<typeof emailOtpSchema>
) {
  const payload = emailOtpSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.requestEmailVerify,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    EmailVerificationRequestSchema
  )
}

export async function verifyEmailToken(token: string) {
  if (!token) {
    throw new AuthClientError({
      code: "token_invalid",
      message: "Verification token missing.",
    })
  }

  return request(
    AUTH_BACKEND_ROUTES.verifyEmail,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
    VerificationFlowSchema
  )
}

export async function requestEmailOtp(
  input: z.infer<typeof emailOtpSchema>
) {
  const payload = emailOtpSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.requestEmailOtp,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    EmailVerificationRequestSchema
  )
}

export async function verifyEmailOtp(
  input: z.infer<typeof emailOtpVerifySchema>
) {
  const payload = emailOtpVerifySchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.verifyEmailOtp,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    VerificationFlowSchema
  )
}

export async function requestPhoneOtp(
  input: z.infer<typeof otpRequestSchema>
) {
  const payload = otpRequestSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.requestPhoneOtp,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    PhoneVerificationRequestSchema
  )
}

export async function verifyPhoneOtp(
  input: z.infer<typeof otpVerifySchema>
) {
  const payload = otpVerifySchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.verifyPhoneOtp,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    VerificationFlowSchema
  )
}

export async function forgotPassword(
  input: z.infer<typeof forgotPasswordSchema>
) {
  const payload = forgotPasswordSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.forgotPassword,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    ForgotPasswordResponseSchema
  )
}

export async function validateResetToken(token: string) {
  if (!token) {
    throw createAuthClientError("token_invalid", {
      message: "Password reset token missing.",
    })
  }

  return request(
    AUTH_BACKEND_ROUTES.validateResetToken,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
    PasswordResetValidationSchema
  )
}

export async function resetPassword(
  input: z.infer<typeof resetPasswordSchema>
) {
  const payload = resetPasswordSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.resetPassword,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    ResetPasswordResponseSchema
  )
}

export async function changePassword(
  token: string,
  input: z.infer<typeof changePasswordSchema>
) {
  if (!token) {
    throw createAuthClientError("missing_token")
  }

  const payload = changePasswordSchema.parse(input)

  return request(
    AUTH_BACKEND_ROUTES.changePassword,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    ChangePasswordResponseSchema
  )
}

export async function refreshSession(refreshToken: string) {
  if (!refreshToken) {
    throw createAuthClientError("missing_refresh_token")
  }

  return request(
    AUTH_BACKEND_ROUTES.refresh,
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    TokenRefreshResponseSchema
  )
}

export async function revokeRefreshToken(refreshToken: string) {
  if (!refreshToken) {
    throw createAuthClientError("missing_refresh_token")
  }

  return request(
    AUTH_BACKEND_ROUTES.revoke,
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    z.object({ revoked: z.boolean() })
  )
}

export async function getUserSessionFromVerificationResponse(response: unknown) {
  const parsed = VerificationFlowSchema.safeParse(response)

  if (!parsed.success || !parsed.data.session) {
    throw createAuthClientError("error", {
      message: "Verification response did not include a session payload.",
      detail: response,
    })
  }

  return AuthSessionSchema.parse(parsed.data.session)
}
