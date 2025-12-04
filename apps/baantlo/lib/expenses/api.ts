import "server-only"

import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/backend/api-client"

import {
  ExpenseListResponseSchema,
  ExpenseSchema,
  type ExpenseListResponse,
  type Expense,
} from "./schema"

const EXPENSES_BASE_PATH = "/expenses"

export async function listExpenses(params?: {
  page?: number
  pageSize?: number
  groupId?: string
  payerId?: string
}): Promise<ExpenseListResponse> {
  return apiGet(EXPENSES_BASE_PATH, ExpenseListResponseSchema, {
    query: {
      page: params?.page,
      page_size: params?.pageSize,
      group_id: params?.groupId,
      payer_id: params?.payerId,
    },
    errorMessage: "Failed to load expenses",
  })
}

export async function getExpense(expenseId: string): Promise<Expense> {
  return apiGet(`${EXPENSES_BASE_PATH}/${expenseId}`, ExpenseSchema, {
    errorMessage: "Failed to load expense",
  })
}

export type ExpenseSplitInput = {
  userId: string
  amount?: number
  percentage?: number
}

export async function createExpense(input: {
  groupId: string
  payerId: string
  amount: number
  currency: string
  description: string
  expenseDate: string
  splits: ExpenseSplitInput[]
  receiptKey?: string | null
}): Promise<Expense> {
  return apiPost(
    EXPENSES_BASE_PATH,
    ExpenseSchema,
    {
      group_id: input.groupId,
      payer_id: input.payerId,
      amount: input.amount.toString(),
      currency: input.currency,
      description: input.description,
      expense_date: input.expenseDate,
      receipt_file: input.receiptKey ?? null,
      splits: input.splits.map((split) => ({
        user_id: split.userId,
        amount: split.amount !== undefined ? split.amount.toString() : undefined,
        percentage: split.percentage,
      })),
    },
    {
      errorMessage: "Failed to create expense",
    }
  )
}

export async function updateExpense(expenseId: string, input: {
  description?: string
  expenseDate?: string
  splits?: ExpenseSplitInput[]
}): Promise<Expense> {
  return apiPut(
    `${EXPENSES_BASE_PATH}/${expenseId}`,
    ExpenseSchema,
    {
      description: input.description,
      expense_date: input.expenseDate,
      splits: input.splits?.map((split) => ({
        user_id: split.userId,
        amount: split.amount !== undefined ? split.amount.toString() : undefined,
        percentage: split.percentage,
      })),
    },
    {
      errorMessage: "Failed to update expense",
    }
  )
}

export async function deleteExpense(expenseId: string): Promise<void> {
  return apiDelete(`${EXPENSES_BASE_PATH}/${expenseId}`, {
    errorMessage: "Failed to delete expense",
  })
}
