import { ResetPasswordForm } from "@/components/auth/forms/reset-password-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { validateResetTokenAction } from "@/lib/auth/actions"

type ResetPasswordPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const tokenParam = (await searchParams)?.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? "" : tokenParam ?? ""

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Reset token missing</AlertTitle>
        <AlertDescription>The password reset link is invalid. Request a new email to continue.</AlertDescription>
      </Alert>
    )
  }

  const validation = await validateResetTokenAction(token)

  if (!validation.valid) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Reset link expired</AlertTitle>
        <AlertDescription>{validation.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <ResetPasswordForm token={token} />
  )
}
