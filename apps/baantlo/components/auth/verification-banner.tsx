'use client'

/**
 * @file verification-banner.tsx
 * @description Highlight banner encouraging users to complete verification steps.
 */

import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BadgeCheck, MailCheck, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

type VerificationType = "email" | "phone" | "both"

type VerificationBannerProps = {
  type: VerificationType
  message?: string
  className?: string
  action?: ReactNode
}

const ICONS: Record<VerificationType, ReactNode> = {
  email: <MailCheck className="h-4 w-4" aria-hidden />,
  phone: <Smartphone className="h-4 w-4" aria-hidden />,
  both: <BadgeCheck className="h-4 w-4" aria-hidden />,
}

const TITLES: Record<VerificationType, string> = {
  email: "Verify your email",
  phone: "Verify your phone",
  both: "Complete your verification",
}

export function VerificationBanner({ type, message, className, action }: VerificationBannerProps) {
  return (
    <Alert className={cn("border-primary/30 bg-primary/5", className)}>
      {ICONS[type]}
      <AlertTitle>{TITLES[type]}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{message ?? defaultMessage(type)}</span>
        {action ? <span className="flex-shrink-0">{action}</span> : null}
      </AlertDescription>
    </Alert>
  )
}

function defaultMessage(type: VerificationType) {
  switch (type) {
    case "email":
      return "You need to confirm your email address before accessing all features."
    case "phone":
      return "Verify your phone number to continue."
    default:
      return "Finish verifying your email and phone to unlock the workspace."
  }
}
