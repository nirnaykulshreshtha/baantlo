
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { AuthLink } from "@/components/auth/auth-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { verifyEmailTokenAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"

type VerifyEmailPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function VerifyEmailTokenPage({ searchParams }: VerifyEmailPageProps) {
  const tokenParam = (await searchParams)?.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? "" : tokenParam ?? ""
  const emailParam = (await searchParams)?.email
  const email = Array.isArray(emailParam) ? emailParam[0] ?? "" : emailParam ?? ""

  if (!token) {
    return (
      <Wrapper>
        <FormError message="Verification token missing. Use the link provided in your email." />
      </Wrapper>
    )
  }

  try {
    const response = await verifyEmailTokenAction(token)
    const message = response.message ?? "Email verified successfully."
    return (
      <Wrapper>
        <FormSuccess message={message} />
        <p className="text-muted-foreground text-sm">
          {response.action === "issue_tokens"
            ? "You can now sign in to your account."
            : "Continue the sign in process below."}
        </p>
        <AuthLink href="/login">Go to sign in</AuthLink>
      </Wrapper>
    )
  } catch (error) {
    const resolved = resolveAuthError(error)
    return (
      <Wrapper>
        <FormError message={resolved.message} />
        {email ? (
          <p className="text-muted-foreground text-sm">
            Try requesting a new verification email for <span className="font-medium">{email}</span>.
          </p>
        ) : null}
        <AuthLink href="/login">Return to sign in</AuthLink>
      </Wrapper>
    )
  }
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>We are confirming your email address.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
