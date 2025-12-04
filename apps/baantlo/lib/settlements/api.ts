import "server-only"

import { z } from "zod"
import { apiGet, apiPost } from "@/lib/backend/api-client"

import {
  SettlementListResponseSchema,
  SettlementSchema,
  type SettlementListResponse,
  type Settlement,
} from "./schema"

const SETTLEMENTS_BASE_PATH = "/settlements"

export async function listSettlements(params?: {
  page?: number
  pageSize?: number
}): Promise<SettlementListResponse> {
  return apiGet(SETTLEMENTS_BASE_PATH, SettlementListResponseSchema, {
    query: {
    page: params?.page,
    page_size: params?.pageSize,
    },
    errorMessage: "Failed to load settlements",
  })
}

export async function getSettlement(settlementId: string): Promise<Settlement> {
  return apiGet(`${SETTLEMENTS_BASE_PATH}/${settlementId}`, SettlementSchema, {
    errorMessage: "Failed to load settlement",
  })
}

export async function createSettlement(input: {
  groupId: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  method: "cash" | "upi" | "bank_transfer"
  notes?: string | null
}): Promise<Settlement> {
  return apiPost(
    SETTLEMENTS_BASE_PATH,
    SettlementSchema,
    {
      group_id: input.groupId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      amount: input.amount.toString(),
      currency: input.currency,
      method: input.method,
      notes: input.notes ?? null,
    },
    {
      errorMessage: "Failed to create settlement",
    }
  )
}

export async function completeSettlement(settlementId: string): Promise<void> {
  return apiPost(
    `${SETTLEMENTS_BASE_PATH}/${settlementId}/complete`,
    z.any().optional(),
    undefined,
    {
      errorMessage: "Failed to complete settlement",
    }
  ) as Promise<void>
}

export async function cancelSettlement(settlementId: string): Promise<void> {
  return apiPost(
    `${SETTLEMENTS_BASE_PATH}/${settlementId}/cancel`,
    z.any().optional(),
    undefined,
    {
      errorMessage: "Failed to cancel settlement",
    }
  ) as Promise<void>
}
