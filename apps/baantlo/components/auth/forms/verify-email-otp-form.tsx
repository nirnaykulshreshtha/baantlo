'use client'

/**
 * @file verify-email-otp-form.tsx
 * @description Form component for verifying email OTP code.
 * This is the second step in the email OTP verification flow.
 */

import { useState, useTransition } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { OtpInput } from "@/components/auth/otp-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { requestEmailOtpAction, verifyEmailOtpAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"
import type { EmailVerificationRequest } from "@/lib/auth/types"

const verifyEmailOtpSchema = z.object({
  code: z.string().length(6, "Enter the 6 digit code"),
})

type VerifyEmailOtpValues = z.infer<typeof verifyEmailOtpSchema>

type VerifyEmailOtpFormProps = {
  email: string
}

/**
 * Verify Email OTP Form Component
 * 
 * Allows users to enter the OTP code sent to their email address.
 * Email is passed as a prop and used for verification.
 * 
 * @param email - The email address to verify (required)
 */
export function VerifyEmailOtpForm({ email }: VerifyEmailOtpFormProps) {
  const form = useForm<VerifyEmailOtpValues>({
    resolver: zodResolver(verifyEmailOtpSchema),
    defaultValues: { code: "" },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendState, setResendState] = useState<EmailVerificationRequest | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const onSubmit = (values: VerifyEmailOtpValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const response = await verifyEmailOtpAction({ email, code: values.code })
        setSuccess(response.message ?? "Email verified successfully.")
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  const handleResend = async () => {
    if (!email) {
      setResendError("Email address is required")
      return
    }
    
    setResendError(null)
    setIsResending(true)
    try {
      const result = await requestEmailOtpAction({ email })
      setResendState(result)
    } catch (error) {
      const resolved = resolveAuthError(error)
      setResendError(resolved.message)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-none">
      <CardHeader>
        <CardTitle>Enter verification code</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="font-medium">{email}</span>. Enter it below to verify your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="code"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <OtpInput value={field.value ?? ""} onChange={field.onChange} length={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? <FormError message={serverError} /> : null}
            {success ? <FormSuccess message={success} /> : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verifying..." : "Verify email"}
            </Button>
          </form>
        </Form>
        
        <Separator className="my-6" />
        
        <div className="space-y-3">
          <div className="space-y-2">
            {resendError ? <FormError message={resendError} /> : null}
            {resendState?.sent ? (
              <FormSuccess
                message={resendState.message ?? "Code sent successfully. Please check your inbox."}
              />
            ) : null}
            {resendState?.cooldown_seconds ? (
              <p className="text-muted-foreground text-xs text-center">
                You can request another code in approximately {resendState.cooldown_seconds} seconds.
              </p>
            ) : null}
          </div>
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || isPending}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isResending ? "Sending..." : "Didn't receive code? Resend"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
