'use client'

/**
 * @file request-phone-otp.tsx
 * @description Reusable card prompting the user to request an SMS OTP for phone verification.
 */

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { resolveAuthError } from "@/lib/auth/errors"
import type { PhoneVerificationRequest } from "@/lib/auth/types"

import { FormError } from "./form-error"
import { FormSuccess } from "./form-success"

type RequestPhoneOtpProps = {
  phone: string
  onRequest: () => Promise<PhoneVerificationRequest>
}

export function RequestPhoneOtp({ phone, onRequest }: RequestPhoneOtpProps) {
  const [state, setState] = useState<PhoneVerificationRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRequest = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await onRequest()
        setState(result)
      } catch (err) {
        const resolved = resolveAuthError(err)
        setError(resolved.message)
      }
    })
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Phone verification required</CardTitle>
        <CardDescription>
          Send a one-time password to <span className="font-medium">{phone}</span> to verify your
          phone number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <FormError message={error} /> : null}
        {state?.sent ? (
          <FormSuccess message="OTP sent successfully. Enter the latest code to continue." />
        ) : null}
        {state?.cooldown_seconds ? (
          <p className="text-muted-foreground text-xs">
            You can request another code in approximately {state.cooldown_seconds} seconds.
          </p>
        ) : null}
        {isPending ? <Skeleton className="h-10 w-full" /> : null}
      </CardContent>
      <CardFooter>
        <Button type="button" disabled={isPending} onClick={handleRequest} className="w-full">
          Send OTP
        </Button>
      </CardFooter>
    </Card>
  )
}
