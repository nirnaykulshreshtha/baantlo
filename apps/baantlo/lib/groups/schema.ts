import { z } from "zod"

export const GroupMemberSchema = z.object({
  user_id: z.string(),
  role: z.string(),
  status: z.string(),
  user_name: z.string().optional().nullable(),
  user_email: z.string().optional().nullable(),
})

export const GroupSummarySchema = z.object({
  group_id: z.string(),
  name: z.string(),
  base_currency: z.string(),
  group_type: z.string(),
  role: z.string(),
  unread_count: z.number().optional(),
  avatar_url: z.string().optional().nullable(),
})

export const GroupListResponseSchema = z.object({
  items: z.array(GroupSummarySchema),
})

export const GroupDetailSchema = z.object({
  group_id: z.string(),
  name: z.string(),
  base_currency: z.string(),
  group_type: z.string(),
  description: z.string().optional().nullable(),
  owner_id: z.string(),
  avatar_url: z.string().optional().nullable(),
  members: z.array(GroupMemberSchema).optional(),
})

export type GroupMember = z.infer<typeof GroupMemberSchema>
export type GroupSummary = z.infer<typeof GroupSummarySchema>
export type GroupListResponse = z.infer<typeof GroupListResponseSchema>
export type GroupDetail = z.infer<typeof GroupDetailSchema>
