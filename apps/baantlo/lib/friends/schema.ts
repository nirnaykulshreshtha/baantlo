import { z } from "zod"

export const FriendItemSchema = z.object({
  user_id: z.string(),
  user_name: z.string().optional().nullable(),
  since: z.string().optional().nullable(),
  status: z.string(),
  invite_id: z.string().optional(),
  via: z.string().optional(),
  created_at: z.string().optional(),
})

export const FriendListResponseSchema = z.object({
  items: z.array(FriendItemSchema),
})

export const FriendInviteResponseSchema = z.object({
  invite_id: z.string(),
  status: z.string(),
})

export type FriendItem = z.infer<typeof FriendItemSchema>
export type FriendListResponse = z.infer<typeof FriendListResponseSchema>
export type FriendInviteResponse = z.infer<typeof FriendInviteResponseSchema>
