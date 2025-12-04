import { z } from "zod"

export const NotificationItemSchema = z.object({
  seq: z.number(),
  op_type: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  payload: z.record(z.any()),
  created_at: z.string(),
})

export const NotificationsResponseSchema = z.object({
  items: z.array(NotificationItemSchema),
  last_seq: z.number(),
  has_more: z.boolean(),
  count: z.number(),
})

export type NotificationItem = z.infer<typeof NotificationItemSchema>
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>
