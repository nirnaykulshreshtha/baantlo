'use client'

/**
 * @file form-error.tsx
 * @description Shared destructive alert for form-level errors.
 */

import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TriangleAlert } from "lucide-react"

type FormErrorProps = {
  title?: string
  message?: string | null
  children?: ReactNode
  className?: string
}

export function FormError({ title = "Something went wrong", message, children, className }: FormErrorProps) {
  if (!message && !children) {
    return null
  }

  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message ?? children}</AlertDescription>
    </Alert>
  )
}
