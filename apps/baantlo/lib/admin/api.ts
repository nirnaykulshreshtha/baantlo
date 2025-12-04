import "server-only"

import { env } from "@/lib/env"
import { getAccessToken } from "@/lib/auth/session-helpers"

import {
  AdminDashboardSummarySchema,
  type AdminDashboardSummary,
} from "./schema"

const ADMIN_DASHBOARD_PATH = "/admin/dashboard"

/**
 * Fetches the aggregated admin dashboard summary for platform administrators.
 */
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const token = await getAccessToken()

  if (!token) {
    throw new Error("Unable to load admin dashboard without an access token.")
  }

  const baseUrl = env.BACKEND_API_URL.replace(/\/+$/, "")
  const url = `${baseUrl}${ADMIN_DASHBOARD_PATH}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: {
      revalidate: 60,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to load admin dashboard (${response.status} ${response.statusText}).`
    )
  }

  const json = await response.json()
  return AdminDashboardSummarySchema.parse(json)
}
