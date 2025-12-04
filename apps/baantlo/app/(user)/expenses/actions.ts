"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseSplitInput,
} from "@/lib/expenses/api"

function toNumber(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function ensureIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  // Accept values already in ISO format.
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed
  }
  // Interpret as date-only string in local timezone and convert to ISO midnight.
  const date = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date.toISOString()
}

function parseSplits(value: FormDataEntryValue | null): ExpenseSplitInput[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(String(value))
    if (!Array.isArray(parsed)) {
      return undefined
    }
    const splits: ExpenseSplitInput[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const userIdRaw = (item as Record<string, unknown>)["userId"]
      if (typeof userIdRaw !== "string" || userIdRaw.trim().length === 0) {
        continue
      }
      const amountRaw = (item as Record<string, unknown>)["amount"]
      const percentageRaw = (item as Record<string, unknown>)["percentage"]
      const split: ExpenseSplitInput = {
        userId: userIdRaw,
      }
      if (typeof amountRaw === "number") {
        split.amount = amountRaw
      } else if (typeof amountRaw === "string" && amountRaw.trim().length > 0) {
        const parsedAmount = Number(amountRaw)
        if (Number.isFinite(parsedAmount)) {
          split.amount = parsedAmount
        }
      }
      if (typeof percentageRaw === "number") {
        split.percentage = percentageRaw
      } else if (typeof percentageRaw === "string" && percentageRaw.trim().length > 0) {
        const parsedPercentage = Number(percentageRaw)
        if (Number.isFinite(parsedPercentage)) {
          split.percentage = parsedPercentage
        }
      }
      splits.push(split)
    }
    return splits.length > 0 ? splits : undefined
  } catch {
    return undefined
  }
}

/**
 * Checks if an error is a Next.js redirect error and re-throws it.
 * Next.js redirect() throws a special error that should not be caught.
 */
function handleRedirectError(error: unknown): void {
  if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
    throw error
  }
}

export async function createExpenseAction(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim()
  const payerId = String(formData.get("payer_id") ?? "").trim()
  const amountValue = String(formData.get("amount") ?? "").trim()
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase()
  const description = String(formData.get("description") ?? "").trim()
  const expenseDateValue = String(formData.get("expense_date") ?? "").trim()
  const splitsValue = formData.get("splits")

  const amount = toNumber(amountValue)
  const expenseDateIso = ensureIsoDate(expenseDateValue)
  const splits = parseSplits(splitsValue)

  if (!groupId || !payerId || amount === undefined || amount <= 0 || !currency || !description || !expenseDateIso || !splits) {
    redirect("/expenses/new?error=Please+fill+in+all+required+fields.")
  }

  try {
    await createExpense({
      groupId,
      payerId,
      amount,
      currency,
      description,
      expenseDate: expenseDateIso,
      splits,
    })
    revalidatePath("/expenses")
    redirect("/expenses?success=Expense+recorded+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create expense right now."
    redirect(`/expenses/new?error=${encodeURIComponent(message)}`)
  }
}

export async function updateExpenseAction(formData: FormData) {
  const expenseId = String(formData.get("expense_id") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const expenseDateValue = String(formData.get("expense_date") ?? "").trim()
  const splitsValue = formData.get("splits")

  if (!expenseId) {
    redirect("/expenses?error=Missing+expense+identifier.")
  }

  const expenseDateIso = expenseDateValue ? ensureIsoDate(expenseDateValue) : undefined
  const splits = parseSplits(splitsValue)

  try {
    await updateExpense(expenseId, {
      description: description || undefined,
      expenseDate: expenseDateIso,
      splits,
    })
    revalidatePath("/expenses")
    revalidatePath(`/expenses/${expenseId}/edit`)
    redirect(`/expenses/${expenseId}/edit?success=${encodeURIComponent("Expense updated successfully.")}`)
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update expense right now."
    redirect(`/expenses/${expenseId}/edit?error=${encodeURIComponent(message)}`)
  }
}

export async function deleteExpenseAction(formData: FormData) {
  const expenseId = String(formData.get("expense_id") ?? "").trim()

  if (!expenseId) {
    redirect("/expenses?error=Missing+expense+identifier.")
  }

  try {
    await deleteExpense(expenseId)
    revalidatePath("/expenses")
    redirect("/expenses?success=Expense+deleted+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete expense right now."
    redirect(`/expenses?error=${encodeURIComponent(message)}`)
  }
}
