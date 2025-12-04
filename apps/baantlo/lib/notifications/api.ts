import "server-only"

import { env } from "@/lib/env"
import { getAccessToken } from "@/lib/auth/session-helpers"
import { extractErrorMessage } from "@/lib/backend/errors"

import {
  NotificationsResponseSchema,
  type NotificationsResponse,
} from "./schema"

const SYNC_BASE_PATH = "/sync"

function getBackendBaseUrl(): string {
  return env.BACKEND_API_URL.replace(/\/+$/, "")
}

async function getAuthToken(): Promise<string> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error("Authentication required to call the backend API.")
  }
  return token
}

export async function getNotifications(params?: {
  sinceSeq?: number
  limit?: number
}): Promise<NotificationsResponse> {
  const token = await getAuthToken()
  const searchParams = new URLSearchParams()
  searchParams.set("since_seq", String(params?.sinceSeq ?? 0))
  searchParams.set("limit", String(params?.limit ?? 50))

  const url = `${getBackendBaseUrl()}${SYNC_BASE_PATH}?${searchParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    const message = extractErrorMessage(
      payload,
      `Failed to load notifications (${response.status} ${response.statusText}).`
    )
    throw new Error(message)
  }

  const json = await response.json()

  try {
    return NotificationsResponseSchema.parse(json)
  } catch (error) {
    console.warn("[notifications] Falling back to relaxed parsing", {
      error,
      payload: json,
    })

    const items = Array.isArray(json?.items)
      ? json.items.map((item: any) => ({
          seq: Number(item?.seq ?? 0),
          op_type: String(item?.op_type ?? ""),
          entity_type: String(item?.entity_type ?? ""),
          entity_id: String(item?.entity_id ?? ""),
          payload:
            item && typeof item.payload === "object" && item.payload !== null
              ? item.payload
              : {},
          created_at: String(item?.created_at ?? ""),
        }))
      : []

    return {
      items,
      last_seq: Number(json?.last_seq ?? 0),
      has_more: Boolean(json?.has_more ?? false),
      count: Number(json?.count ?? items.length),
    }
  }
}
