import "server-only"

import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/backend/api-client"

import {
  GroupListResponseSchema,
  GroupDetailSchema,
  type GroupListResponse,
  type GroupDetail,
} from "./schema"

const GROUPS_BASE_PATH = "/groups"

export async function listGroups(): Promise<GroupListResponse> {
  return apiGet(GROUPS_BASE_PATH, GroupListResponseSchema, {
    errorMessage: "Failed to load groups",
    includeErrorDetails: true,
  })
}

export async function getGroup(groupId: string): Promise<GroupDetail> {
  return apiGet(`${GROUPS_BASE_PATH}/${groupId}`, GroupDetailSchema, {
    errorMessage: "Failed to load group",
    includeErrorDetails: true,
  })
}

export async function createGroup(input: {
  name: string
  baseCurrency?: string
  groupType: string
  description?: string | null
}): Promise<GroupDetail> {
  return apiPost(
    GROUPS_BASE_PATH,
    GroupDetailSchema,
    {
      name: input.name,
      base_currency: input.baseCurrency,
      group_type: input.groupType,
      description: input.description,
    },
    {
      errorMessage: "Failed to create group",
      includeErrorDetails: true,
    }
  )
}

export async function updateGroup(groupId: string, input: {
  name?: string
  baseCurrency?: string
  groupType?: string
  description?: string | null
}): Promise<GroupDetail> {
  return apiPatch(
    `${GROUPS_BASE_PATH}/${groupId}`,
    GroupDetailSchema,
    {
      name: input.name,
      base_currency: input.baseCurrency,
      group_type: input.groupType,
      description: input.description,
    },
    {
      errorMessage: "Failed to update group",
      includeErrorDetails: true,
    }
  )
}

export async function deleteGroup(groupId: string): Promise<void> {
  return apiDelete(`${GROUPS_BASE_PATH}/${groupId}`, {
    errorMessage: "Failed to archive group",
    includeErrorDetails: true,
  })
}
