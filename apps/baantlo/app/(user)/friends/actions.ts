"use server"

import { randomUUID } from "crypto"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  createFriendInvite,
  deleteFriend,
} from "@/lib/friends/api"

function toFriendlyInviteMessage(message: string): string {
  const normalized = message.toLowerCase()
  switch (normalized) {
    case "already_friends":
      return "You are already connected with this person."
    case "blocked":
      return "You cannot invite this user because someone has blocked the other."
    case "invite_exists":
      return "An invite is already pending for this contact."
    case "rate_limited":
      return "You are sending invites too quickly. Please try again later."
    case "invalid_phone":
      return "Please enter a valid phone number."
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

export async function createFriendInviteAction(formData: FormData) {
  const via = String(formData.get("via") ?? "").trim().toLowerCase()
  const value = String(formData.get("value") ?? "").trim()

  if (!value) {
    redirect("/friends?error=Please+provide+an+email+address+or+phone+number.")
  }

  if (via !== "email" && via !== "phone") {
    redirect("/friends?error=Please+select+how+you+would+like+to+invite.")
  }

  try {
    await createFriendInvite({
      via,
      value,
      clientRequestId: randomUUID().replace(/-/g, "").slice(0, 32),
    })
    revalidatePath("/friends")
    redirect("/friends?success=Invite+sent+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? toFriendlyInviteMessage(error.message)
        : "Unable to send invite right now."
    redirect(`/friends?error=${encodeURIComponent(message)}`)
  }
}

export async function deleteFriendAction(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "").trim()

  if (!userId) {
    redirect("/friends?error=Missing+friend+identifier.")
  }

  try {
    await deleteFriend(userId)
    revalidatePath("/friends")
    redirect("/friends?success=Friend+removed+successfully.")
  } catch (error) {
    handleRedirectError(error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to remove friend right now."
    redirect(`/friends?error=${encodeURIComponent(message)}`)
  }
}
