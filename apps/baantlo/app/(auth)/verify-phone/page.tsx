import { RequestPhoneOtpForm } from "@/components/auth/forms/request-phone-otp-form"
import { VerifyPhoneOtpForm } from "@/components/auth/forms/verify-phone-otp-form"

type VerifyPhonePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

/**
 * Verify Phone OTP Page
 * 
 * Handles the two-step phone OTP verification flow:
 * 1. Request step: User enters phone to receive OTP
 * 2. Verify step: User enters OTP code to verify phone
 */
export default async function VerifyPhonePage({ searchParams }: VerifyPhonePageProps) {
  const params = await searchParams
  const phoneParam = params?.phone
  const stepParam = params?.step
  
  const phone = Array.isArray(phoneParam) ? phoneParam[0] ?? "" : phoneParam ?? ""
  const step = Array.isArray(stepParam) ? stepParam[0] : stepParam

  // If step is "verify" and phone is provided, show verification form
  if (step === "verify" && phone) {
    return <VerifyPhoneOtpForm phone={phone} />
  }

  // Otherwise, show request form
  return <RequestPhoneOtpForm initialPhone={phone} />
}
