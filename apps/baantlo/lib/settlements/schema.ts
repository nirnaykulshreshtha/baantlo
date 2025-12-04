import { z } from "zod"

export const SettlementSchema = z.object({
  id: z.string(),
  group_id: z.string(),
  from_user_id: z.string(),
  from_user_name: z.string().optional().nullable(),
  to_user_id: z.string(),
  to_user_name: z.string().optional().nullable(),
  amount: z.coerce.number(),
  amount_inr: z.coerce.number(),
  currency: z.string(),
  method: z.string(),
  status: z.string(),
  notes: z.string().optional().nullable(),
  settled_at: z.string().optional().nullable(),
  created_by: z.string(),
  created_at: z.string(),
})

export const SettlementListResponseSchema = z.object({
  items: z.array(SettlementSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
})

export type Settlement = z.infer<typeof SettlementSchema>
export type SettlementListResponse = z.infer<typeof SettlementListResponseSchema>
