import { VerifyEmailOtpForm } from "@/components/auth/forms/verify-email-otp-form"

type VerifyEmailOtpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function VerifyEmailOtpPage({ searchParams }: VerifyEmailOtpPageProps) {
  const emailParam = (await searchParams)?.email
  const email = Array.isArray(emailParam) ? emailParam[0] ?? "" : emailParam ?? ""

  return (
    <VerifyEmailOtpForm initialEmail={email} />
  )
}
