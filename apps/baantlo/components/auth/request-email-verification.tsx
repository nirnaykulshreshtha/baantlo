'use client'

/**
 * @file request-email-verification.tsx
 * @description Reusable card prompting the user to request an email verification email/OTP.
 */

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { resolveAuthError } from "@/lib/auth/errors"
import type { EmailVerificationRequest } from "@/lib/auth/types"

import { FormError } from "./form-error"
import { FormSuccess } from "./form-success"

type RequestEmailVerificationProps = {
  email: string
  onRequest: () => Promise<EmailVerificationRequest>
}

export function RequestEmailVerification({ email, onRequest }: RequestEmailVerificationProps) {
  const [state, setState] = useState<EmailVerificationRequest | null>(null)
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
        <CardTitle className="text-base">Email verification required</CardTitle>
        <CardDescription>
          We emailed verification options to <span className="font-medium">{email}</span>. If you
          did not receive the email, you can request another code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <FormError message={error} /> : null}
        {state?.sent ? (
          <FormSuccess
            message={state.message ?? "Verification email sent. Please check your inbox."}
          />
        ) : null}
        {state?.cooldown_seconds ? (
          <p className="text-muted-foreground text-xs">
            You can request another code in approximately {state.cooldown_seconds} seconds.
          </p>
        ) : null}
        {isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : null}
      </CardContent>
      <CardFooter>
        <Button type="button" disabled={isPending} onClick={handleRequest} className="w-full">
          Resend verification
        </Button>
      </CardFooter>
    </Card>
  )
}
