import "server-only"

import { z } from "zod"
import { apiGet, apiPost, apiDelete } from "@/lib/backend/api-client"

import {
  FriendListResponseSchema,
  FriendInviteResponseSchema,
  type FriendListResponse,
  type FriendInviteResponse,
} from "./schema"

const FRIENDS_BASE_PATH = "/friends"

export async function listFriends(): Promise<FriendListResponse> {
  return apiGet(FRIENDS_BASE_PATH, FriendListResponseSchema, {
    errorMessage: "Failed to load friends",
  })
}

export async function createFriendInvite(input: {
  via: "email" | "phone"
  value: string
  clientRequestId: string
}): Promise<FriendInviteResponse> {
  return apiPost(
    `${FRIENDS_BASE_PATH}/invites`,
    FriendInviteResponseSchema,
    {
      via: input.via,
      value: input.value,
      client_request_id: input.clientRequestId,
    },
    {
      errorMessage: "Failed to send invite",
    }
  )
}

export async function deleteFriend(friendUserId: string): Promise<void> {
  return apiDelete(`${FRIENDS_BASE_PATH}/${friendUserId}`, {
    errorMessage: "Failed to remove friend",
  })
}

export async function blockFriend(friendUserId: string): Promise<void> {
  return apiPost(
    `${FRIENDS_BASE_PATH}/${friendUserId}/block`,
    z.any().optional(),
    undefined,
    {
      errorMessage: "Failed to block friend",
    }
  ) as Promise<void>
}

export async function unblockFriend(friendUserId: string): Promise<void> {
  return apiPost(
    `${FRIENDS_BASE_PATH}/${friendUserId}/unblock`,
    z.any().optional(),
    undefined,
    {
      errorMessage: "Failed to unblock friend",
    }
  ) as Promise<void>
}
