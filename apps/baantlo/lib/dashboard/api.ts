import "server-only"

import { env } from "@/lib/env"
import { getAccessToken } from "@/lib/auth/session-helpers"

import { DashboardStatsSchema, type DashboardStats } from "./schema"

const DASHBOARD_STATS_PATH = "/dashboard/stats"

/**
 * Fetches the aggregated dashboard statistics for the authenticated user.
 * Wraps the FastAPI dashboard endpoint and validates the response shape.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const token = await getAccessToken()

  if (!token) {
    throw new Error("Unable to load dashboard without an access token.")
  }

  const baseUrl = env.BACKEND_API_URL.replace(/\/+$/, "")
  const url = `${baseUrl}${DASHBOARD_STATS_PATH}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: {
      revalidate: 30,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to load dashboard data (${response.status} ${response.statusText}).`
    )
  }

  const json = await response.json()
  return DashboardStatsSchema.parse(json)
}
