import { z } from "zod"

export const ExpenseSplitSchema = z.object({
  user_id: z.string(),
  user_name: z.string().optional().nullable(),
  amount: z.coerce.number(),
  amount_inr: z.coerce.number(),
  percentage: z.coerce.number().optional().nullable(),
})

export const ExpenseSchema = z.object({
  id: z.string(),
  group_id: z.string(),
  payer_id: z.string(),
  payer_name: z.string().optional().nullable(),
  amount: z.coerce.number(),
  currency: z.string(),
  amount_inr: z.coerce.number(),
  description: z.string(),
  expense_date: z.string(),
  receipt_key: z.string().optional().nullable(),
  created_by: z.string(),
  created_at: z.string(),
  splits: z.array(ExpenseSplitSchema),
})

export const ExpenseListResponseSchema = z.object({
  items: z.array(ExpenseSchema),
  total: z.number(),
  total_filtered_amount: z.coerce.number().optional(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
})

export type ExpenseSplit = z.infer<typeof ExpenseSplitSchema>
export type Expense = z.infer<typeof ExpenseSchema>
export type ExpenseListResponse = z.infer<typeof ExpenseListResponseSchema>
