import { Suspense } from "react"

import { ChangePasswordForm } from "@/components/auth/forms/change-password-form"
import { AuthErrorBoundary } from "@/components/auth/auth-error-boundary"
import { Skeleton } from "@/components/ui/skeleton"

export default function ChangePasswordPage() {
  return (
    <section className="flex flex-col gap-6">
      <AuthErrorBoundary>
        <Suspense fallback={<Skeleton className="h-[360px] w-full" />}>
          <ChangePasswordForm />
        </Suspense>
      </AuthErrorBoundary>
    </section>
  )
}
