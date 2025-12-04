"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  createGroup,
  updateGroup,
  deleteGroup,
} from "@/lib/groups/api"

function normalizeString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toFriendlyGroupMessage(message: string): string {
  const normalized = message.toLowerCase()
  switch (normalized) {
    case "currency_locked":
      return "Currency cannot be updated because the group already has expenses."
    case "group_has_expenses":
      return "Groups with expenses cannot be archived."
    case "forbidden":
      return "You do not have permission to perform this action."
    default:
      return message
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

export async function createGroupAction(formData: FormData) {
  const name = normalizeString(String(formData.get("name") ?? ""))
  const groupType = normalizeString(String(formData.get("group_type") ?? ""))?.toLowerCase()
  const baseCurrency = normalizeString(String(formData.get("base_currency") ?? ""))?.toUpperCase()
  const descriptionRaw = normalizeString(String(formData.get("description") ?? ""))

  if (!name || !groupType) {
    redirect("/groups/new?error=Please+provide+a+name+and+group+type.")
  }

  try {
    await createGroup({
      name,
      groupType,
      baseCurrency,
      description: descriptionRaw ?? null,
    })
    revalidatePath("/groups")
    redirect("/groups?success=Group+created+successfully.")
  } catch (error) {
    handleRedirectError(error)
    console.error("Error creating group:", error)
    const message =
      error instanceof Error
        ? toFriendlyGroupMessage(error.message)
        : "Unable to create group right now."
    redirect(`/groups/new?error=${encodeURIComponent(message)}`)
  }
}

export async function updateGroupAction(formData: FormData) {
  const groupId = normalizeString(String(formData.get("group_id") ?? ""))
  const name = normalizeString(String(formData.get("name") ?? ""))
  const baseCurrency = normalizeString(String(formData.get("base_currency") ?? ""))?.toUpperCase()
  const groupType = normalizeString(String(formData.get("group_type") ?? ""))?.toLowerCase()
  const descriptionRaw = normalizeString(String(formData.get("description") ?? ""))

  if (!groupId) {
    redirect("/groups?error=Missing+group+identifier.")
  }

  try {
    await updateGroup(groupId, {
      name,
      baseCurrency,
      groupType,
      description: descriptionRaw ?? null,
    })
    revalidatePath("/groups")
    revalidatePath(`/groups/${groupId}/edit`)
    redirect(`/groups/${groupId}/edit?success=${encodeURIComponent("Group updated successfully.")}`)
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? toFriendlyGroupMessage(error.message)
        : "Unable to update group right now."
    redirect(`/groups/${groupId}/edit?error=${encodeURIComponent(message)}`)
  }
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = normalizeString(String(formData.get("group_id") ?? ""))

  if (!groupId) {
    redirect("/groups?error=Missing+group+identifier.")
  }

  try {
    await deleteGroup(groupId)
    revalidatePath("/groups")
    redirect("/groups?success=Group+archived+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? toFriendlyGroupMessage(error.message)
        : "Unable to archive group right now."
    redirect(`/groups?error=${encodeURIComponent(message)}`)
  }
}
