'use client'

/**
 * @file form-success.tsx
 * @description Shared success alert for auth flows.
 */

import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

type FormSuccessProps = {
  title?: string
  message?: string | null
  children?: ReactNode
  className?: string
}

export function FormSuccess({ title = "Success", message, children, className }: FormSuccessProps) {
  if (!message && !children) {
    return null
  }

  return (
    <Alert className={className}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message ?? children}</AlertDescription>
    </Alert>
  )
}
