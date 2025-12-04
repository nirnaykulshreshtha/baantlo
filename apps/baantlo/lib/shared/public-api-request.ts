/**
 * @file public-api-request.ts
 * @description Shared utility for making public API requests (no authentication required).
 * Works on both server and client, suitable for public endpoints and Next.js API routes.
 */

import { z } from "zod"
import { extractErrorMessage } from "@/lib/backend/errors"

/**
 * Gets the base URL for constructing absolute URLs on the server.
 * Uses NEXTAUTH_URL if available, otherwise falls back to localhost.
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use current origin
    return window.location.origin
  }

  // Server-side: use NEXTAUTH_URL or fallback to localhost
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

/**
 * Converts a relative URL to an absolute URL if needed.
 * On the server, relative URLs must be converted to absolute URLs for fetch.
 * On the client, relative URLs work fine.
 */
function normalizeUrl(url: string): string {
  // If already absolute, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  // If relative and on server, make it absolute
  if (typeof window === "undefined" && url.startsWith("/")) {
    return `${getBaseUrl()}${url}`
  }

  // Client-side relative URLs are fine
  return url
}

/**
 * Options for public API requests (no authentication required)
 */
export type PublicApiRequestOptions = {
  /** Full URL to the endpoint (can be relative for Next.js API routes) */
  url: string
  /** Query parameters */
  query?: Record<string, string | number | undefined>
  /** Custom error message prefix */
  errorMessage?: string
  /** Whether to include error details in thrown error (default: false) */
  includeErrorDetails?: boolean
  /** Whether to use Next.js cache revalidation (server-side only, default: false) */
  revalidate?: number
}

/**
 * Builds a query string from parameters, filtering out undefined/null values.
 * @param params - Object with query parameters
 * @returns Query string (e.g., "?key=value&key2=value2" or empty string)
 */
function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    searchParams.set(key, String(value))
  }
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

/**
 * Generic public API request function that handles error handling and response parsing.
 * Does not require authentication - useful for public endpoints or Next.js API routes.
 * Works on both server and client.
 * 
 * @param schema - Zod schema for response validation
 * @param options - Request options
 * @returns Parsed and validated response
 */
export async function publicApiRequest<T>(
  schema: z.ZodSchema<T>,
  options: PublicApiRequestOptions
): Promise<T> {
  const {
    url,
    query,
    errorMessage,
    includeErrorDetails = false,
    revalidate,
  } = options

  if (!url) {
    throw new Error("URL is required for public API request")
  }

  const isServer = typeof window === "undefined"
  const queryString = query ? buildQuery(query) : ""
  // Normalize URL: convert relative to absolute on server
  const normalizedUrl = normalizeUrl(url)
  const fullUrl = `${normalizedUrl}${queryString}`

  const headers: HeadersInit = {
    Accept: "application/json",
  }

  const fetchOptions: RequestInit = {
    method: "GET",
    headers,
    cache: "no-store",
  }

  // Add Next.js cache revalidation on server if specified
  if (isServer && revalidate !== undefined) {
    fetchOptions.next = { revalidate }
  }

  const response = await fetch(fullUrl, fetchOptions)

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

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  const json = await response.json()

  // Validate response with schema
  try {
    return schema.parse(json)
  } catch (error) {
    console.error(`Schema validation error for ${url}:`, error)
    console.error("Response JSON:", JSON.stringify(json, null, 2))
    throw new Error(
      `Invalid response format from server: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

