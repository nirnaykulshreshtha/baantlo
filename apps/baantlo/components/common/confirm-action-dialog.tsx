"use client"

/**
 * @file confirm-action-dialog.tsx
 * @description Shared confirmation dialog that wraps server action forms with an accessible, animated prompt.
 * Integrates with Next.js server actions via the native form `action` attribute.
 */

import type { ReactNode } from "react"
import { useId } from "react"
import { Loader2 } from "lucide-react"
import { useFormStatus } from "react-dom"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type HiddenField = {
  name: string
  value: string
}

type ConfirmActionDialogProps = {
  /** Trigger element rendered as the dialog opener. Usually a Button. */
  trigger: ReactNode
  /** Server action invoked when the user confirms the dialog. */
  action: (formData: FormData) => void | Promise<void>
  /** Hidden field values forwarded with the form submission. */
  fields: HiddenField[]
  /** Title text displayed within the dialog. */
  title: string
  /** Supporting description rendered below the title. */
  description?: ReactNode
  /** Optional extra content between the description and footer. */
  body?: ReactNode
  /** Label for the confirm CTA button. */
  confirmLabel?: string
  /** Label for the cancel button. */
  cancelLabel?: string
  /** Optional label rendered while the confirm action is pending. */
  pendingLabel?: string
  /** Visual variant of the confirm button. */
  tone?: "default" | "destructive"
  /** Optional callback to focus a safe target when the dialog closes. */
  onOpenChange?: (open: boolean) => void
}

/**
 * Renders a shared confirmation dialog wrapping a server action form.
 * Ensures consistent accessibility, keyboard support, and pending states.
 */
export function ConfirmActionDialog({
  trigger,
  action,
  fields,
  title,
  description,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel,
  tone = "default",
  onOpenChange,
}: ConfirmActionDialogProps) {
  const dialogTitleId = useId()
  const dialogDescriptionId = description ? useId() : undefined

  return (
    <AlertDialog onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        role="alertdialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
      >
        <form action={action} className="space-y-6">
          <AlertDialogHeader>
            <AlertDialogTitle id={dialogTitleId}>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription id={dialogDescriptionId}>
                {description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          {fields.map((field) => (
            <input
              key={`${field.name}-${field.value}`}
              type="hidden"
              name={field.name}
              value={field.value}
            />
          ))}

          {body}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">{cancelLabel}</AlertDialogCancel>
            <ConfirmSubmitButton
              tone={tone}
              confirmLabel={confirmLabel}
              pendingLabel={pendingLabel}
            />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type ConfirmSubmitButtonProps = {
  confirmLabel: string
  pendingLabel?: string
  tone: "default" | "destructive"
}

/**
 * Submit button tied to the surrounding form status,
 * displaying a busy indicator while the server action is running.
 */
function ConfirmSubmitButton({
  confirmLabel,
  pendingLabel,
  tone,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <AlertDialogAction
      type="submit"
      className={cn(
        "inline-flex items-center gap-2",
        tone === "destructive"
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/50"
          : "",
        pending && "pointer-events-none opacity-80",
      )}
      aria-live="polite"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        confirmLabel
      )}
    </AlertDialogAction>
  )
}

