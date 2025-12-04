'use client'

import { cn } from "@/lib/utils"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"

type FormFeedbackProps = {
  error?: string | null
  success?: string | null
  className?: string
}

export function FormFeedback({ error, success, className }: FormFeedbackProps) {
  if (!error && !success) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {error ? <FormError message={error} /> : null}
      {success ? <FormSuccess message={success} /> : null}
    </div>
  )
}
