import { VerifyPhoneOtpForm } from "@/components/auth/forms/verify-phone-otp-form"

type VerifyPhonePageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function VerifyPhonePage({ searchParams }: VerifyPhonePageProps) {
  const phoneParam = (await searchParams)?.phone
  const phone = Array.isArray(phoneParam) ? phoneParam[0] ?? "" : phoneParam ?? ""

  return (
    <VerifyPhoneOtpForm initialPhone={phone} />
  )
}
