import { RequestEmailOtpForm } from "@/components/auth/forms/request-email-otp-form"
import { VerifyEmailOtpForm } from "@/components/auth/forms/verify-email-otp-form"

type VerifyEmailOtpPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

/**
 * Verify Email OTP Page
 * 
 * Handles the two-step email OTP verification flow:
 * 1. Request step: User enters email to receive OTP
 * 2. Verify step: User enters OTP code to verify email
 */
export default async function VerifyEmailOtpPage({ searchParams }: VerifyEmailOtpPageProps) {
  const params = await searchParams
  const emailParam = params?.email
  const stepParam = params?.step
  
  const email = Array.isArray(emailParam) ? emailParam[0] ?? "" : emailParam ?? ""
  const step = Array.isArray(stepParam) ? stepParam[0] : stepParam

  // If step is "verify" and email is provided, show verification form
  if (step === "verify" && email) {
    return <VerifyEmailOtpForm email={email} />
  }

  // Otherwise, show request form
  return <RequestEmailOtpForm initialEmail={email} />
}
