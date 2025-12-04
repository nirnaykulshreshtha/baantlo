import "server-only"

import { z } from "zod"
import { env } from "@/lib/env"
import { getAccessToken } from "@/lib/auth/session-helpers"
import { extractErrorMessage } from "./errors"

/**
 * Gets the backend API base URL, removing trailing slashes.
 * @returns The normalized backend API URL
 */
export function getBackendBaseUrl(): string {
  return env.BACKEND_API_URL.replace(/\/+$/, "")
}

/**
 * Gets the authentication token for API requests.
 * @throws Error if no token is available
 * @returns The authentication token
 */
export async function getAuthToken(): Promise<string> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error("Authentication required to call the backend API.")
  }
  return token
}

/**
 * Builds a query string from parameters, filtering out undefined/null values.
 * @param params - Object with query parameters
 * @returns Query string (e.g., "?key=value&key2=value2" or empty string)
 */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    searchParams.set(key, String(value))
  }
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

/**
 * Options for API requests
 */
export type ApiRequestOptions = {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** Request body (will be JSON stringified) */
  body?: unknown
  /** Query parameters */
  query?: Record<string, string | number | undefined>
  /** Custom error message prefix */
  errorMessage?: string
  /** Whether to include status and detail in error (default: false) */
  includeErrorDetails?: boolean
}


/**
 * Generic API request function that handles authentication, error handling, and response parsing.
 * @param path - API endpoint path (e.g., "/groups" or "/expenses/123")
 * @param schema - Zod schema for response validation
 * @param options - Request options
 * @returns Parsed and validated response
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    errorMessage,
    includeErrorDetails = false,
  } = options

  const token = await getAuthToken()
  const baseUrl = getBackendBaseUrl()
  const queryString = query ? buildQuery(query) : ""
  const url = `${baseUrl}${path}${queryString}`

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  }

  if (body !== undefined && (method === "POST" || method === "PUT" || method === "PATCH")) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(url, {
    method,
    headers,
    cache: "no-store",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    const defaultMessage = errorMessage || `API request failed (${response.status} ${response.statusText})`
    const message = extractErrorMessage(payload, defaultMessage)

    if (includeErrorDetails) {
      const error = new Error(message) as Error & { status?: number; detail?: unknown }
      error.status = response.status
      error.detail = payload
      throw error
    }

    throw new Error(message)
  }

  // For DELETE requests with no content (204), return void
  if (method === "DELETE" && response.status === 204) {
    return undefined as T
  }

  // For POST requests that might return 204 (no content)
  if (response.status === 204) {
    return undefined as T
  }

  const json = await response.json()

  // Validate response with schema
  try {
    return schema.parse(json)
  } catch (error) {
    console.error(`Schema validation error for ${path}:`, error)
    console.error("Response JSON:", JSON.stringify(json, null, 2))
    throw new Error(
      `Invalid response format from server: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Convenience function for GET requests
 */
export async function apiGet<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest(path, schema, { ...options, method: "GET" })
}

/**
 * Convenience function for POST requests
 */
export async function apiPost<T>(
  path: string,
  schema: z.ZodSchema<T>,
  body: unknown,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest(path, schema, { ...options, method: "POST", body })
}

/**
 * Convenience function for PUT requests
 */
export async function apiPut<T>(
  path: string,
  schema: z.ZodSchema<T>,
  body: unknown,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest(path, schema, { ...options, method: "PUT", body })
}

/**
 * Convenience function for PATCH requests
 */
export async function apiPatch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  body: unknown,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<T> {
  return apiRequest(path, schema, { ...options, method: "PATCH", body })
}

/**
 * Convenience function for DELETE requests
 */
export async function apiDelete(
  path: string,
  options?: Omit<ApiRequestOptions, "method" | "body">
): Promise<void> {
  return apiRequest(path, z.any().optional(), { ...options, method: "DELETE" }) as Promise<void>
}

