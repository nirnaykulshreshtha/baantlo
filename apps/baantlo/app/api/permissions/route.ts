/**
 * @file route.ts
 * @description Next.js API route that fetches permissions from the backend and caches them.
 * This route serves as a proxy between the frontend and backend, providing caching
 * and error handling for permissions configuration.
 * 
 * The permissions are cached for 1 hour (3600 seconds) to reduce backend load
 * while ensuring the frontend stays in sync with backend changes.
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"
export const revalidate = 3600 // Cache for 1 hour

type PermissionsResponse = {
  platform_permissions: string[]
  group_permissions: string[]
  platform_roles: Record<string, string[]>
  group_roles: Record<string, string[]>
}

/**
 * Fetches permissions configuration from the backend API.
 * 
 * @returns Permissions configuration object
 * @throws Error if the backend request fails
 */
async function fetchPermissionsFromBackend(): Promise<PermissionsResponse> {
  const backendUrl = env.BACKEND_API_URL.replace(/\/+$/, "")
  const permissionsUrl = `${backendUrl}/auth/permissions`

  console.log("[Permissions API] Fetching permissions from backend:", {
    backendUrl,
    permissionsUrl,
    fullUrl: permissionsUrl,
  })

  const response = await fetch(permissionsUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    // Use cache with revalidation
    next: {
      revalidate: 3600, // Revalidate every hour
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    console.error(
      `[Permissions API] Backend request failed: ${response.status} ${response.statusText}`,
      {
        url: permissionsUrl,
        status: response.status,
        statusText: response.statusText,
        errorText,
        backendUrl: env.BACKEND_API_URL,
      }
    )
    throw new Error(
      `Failed to fetch permissions from ${permissionsUrl}: ${response.status} ${response.statusText}. ${errorText}`
    )
  }

  const data = await response.json()
  console.log(
    `[Permissions API] Successfully fetched permissions: ${data.platform_permissions?.length || 0} platform permissions, ${data.group_permissions?.length || 0} group permissions`
  )

  return data as PermissionsResponse
}

/**
 * GET handler for /api/permissions
 * Returns the permissions configuration from the backend.
 */
export async function GET() {
  try {
    const permissions = await fetchPermissionsFromBackend()
    return NextResponse.json(permissions, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("[Permissions API] Error fetching permissions:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch permissions configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

