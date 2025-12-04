"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  createSettlement,
  completeSettlement,
  cancelSettlement,
} from "@/lib/settlements/api"

function toNumber(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
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

export async function createSettlementAction(formData: FormData) {
  const groupId = normalizeString(String(formData.get("group_id") ?? ""))
  const fromUserId = normalizeString(String(formData.get("from_user_id") ?? ""))
  const toUserId = normalizeString(String(formData.get("to_user_id") ?? ""))
  const amountValue = normalizeString(String(formData.get("amount") ?? ""))
  const currency = normalizeString(String(formData.get("currency") ?? ""))?.toUpperCase()
  const method = normalizeString(String(formData.get("method") ?? ""))?.toLowerCase()
  const notes = normalizeString(String(formData.get("notes") ?? ""))

  const amount = toNumber(amountValue)

  if (
    !groupId ||
    !fromUserId ||
    !toUserId ||
    !amount ||
    amount <= 0 ||
    !currency ||
    !method
  ) {
    redirect("/settlements/new?error=Please+fill+in+all+required+fields.")
  }

  if (fromUserId === toUserId) {
    redirect("/settlements/new?error=Choose+two+different+members+for+the+settlement.")
  }

  if (!["cash", "upi", "bank_transfer"].includes(method)) {
    redirect("/settlements/new?error=Please+select+a+valid+settlement+method.")
  }

  try {
    await createSettlement({
      groupId,
      fromUserId,
      toUserId,
      amount,
      currency,
      method: method as "cash" | "upi" | "bank_transfer",
      notes: notes ?? null,
    })
    revalidatePath("/settlements")
    redirect("/settlements?success=Settlement+recorded+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create settlement right now."
    redirect(`/settlements/new?error=${encodeURIComponent(message)}`)
  }
}

export async function completeSettlementAction(formData: FormData) {
  const settlementId = normalizeString(String(formData.get("settlement_id") ?? ""))

  if (!settlementId) {
    redirect("/settlements?error=Missing+settlement+identifier.")
  }

  try {
    await completeSettlement(settlementId)
    revalidatePath("/settlements")
    redirect("/settlements?success=Settlement+marked+as+completed.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to complete settlement right now."
    redirect(`/settlements?error=${encodeURIComponent(message)}`)
  }
}

export async function cancelSettlementAction(formData: FormData) {
  const settlementId = normalizeString(String(formData.get("settlement_id") ?? ""))

  if (!settlementId) {
    redirect("/settlements?error=Missing+settlement+identifier.")
  }

  try {
    await cancelSettlement(settlementId)
    revalidatePath("/settlements")
    redirect("/settlements?success=Settlement+cancelled+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to cancel settlement right now."
    redirect(`/settlements?error=${encodeURIComponent(message)}`)
  }
}
