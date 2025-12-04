import { Suspense } from "react"

import { ForgotPasswordForm } from "@/components/auth/forms/forgot-password-form"
import { AuthErrorBoundary } from "@/components/auth/auth-error-boundary"
import { Skeleton } from "@/components/ui/skeleton"

export default function ForgotPasswordPage() {
  return (
    <AuthErrorBoundary>
        <Suspense fallback={<Skeleton className="h-[380px] w-full" />}>
          <ForgotPasswordForm />
        </Suspense>
      </AuthErrorBoundary>
  )
}
