'use client'

/**
 * @file verify-phone-otp-form.tsx
 * @description Form component for verifying phone OTP code.
 * This is the second step in the phone OTP verification flow.
 */

import { useState, useTransition, useMemo, useEffect } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { CountdownTimer } from "@/components/common/countdown-timer"
import { useCountdownTimer } from "@/hooks/use-countdown-timer"
import { OtpInput } from "@/components/auth/otp-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { requestPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"
import type { PhoneVerificationRequest } from "@/lib/auth/types"

const verifyPhoneOtpSchema = z.object({
  code: z.string().length(6, "Enter the 6 digit code"),
})

type VerifyPhoneOtpValues = z.infer<typeof verifyPhoneOtpSchema>

type VerifyPhoneOtpFormProps = {
  phone: string
}

/**
 * Verify Phone OTP Form Component
 * 
 * Allows users to enter the OTP code sent to their phone number.
 * Phone is passed as a prop and used for verification.
 * 
 * @param phone - The phone number to verify (required)
 */
export function VerifyPhoneOtpForm({ phone }: VerifyPhoneOtpFormProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  const form = useForm<VerifyPhoneOtpValues>({
    resolver: zodResolver(verifyPhoneOtpSchema),
    defaultValues: { code: "" },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendState, setResendState] = useState<PhoneVerificationRequest | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [cooldownStartTime, setCooldownStartTime] = useState<number | null>(null)

  // Calculate target timestamp for countdown
  const cooldownTargetTimestamp = useMemo(() => {
    if (!resendState?.cooldown_seconds || !cooldownStartTime || resendState.cooldown_seconds <= 0) {
      return null
    }
    return cooldownStartTime + resendState.cooldown_seconds
  }, [resendState?.cooldown_seconds, cooldownStartTime])

  // Check if countdown is expired
  const countdown = useCountdownTimer(cooldownTargetTimestamp, !!cooldownTargetTimestamp)
  const isCooldownActive = !!(cooldownTargetTimestamp && !countdown.isExpired)

  // Clear cooldown when timer expires
  useEffect(() => {
    if (!cooldownTargetTimestamp) return

    const checkExpiration = () => {
      const now = Math.floor(Date.now() / 1000)
      if (now >= cooldownTargetTimestamp) {
        setCooldownStartTime(null)
        setResendState(null)
      }
    }

    // Check immediately
    checkExpiration()

    // Check every second
    const interval = setInterval(checkExpiration, 1000)
    return () => clearInterval(interval)
  }, [cooldownTargetTimestamp])

  const onSubmit = (values: VerifyPhoneOtpValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const response = await verifyPhoneOtpAction({ phone, code: values.code })
        setSuccess(response.message ?? "Phone verified successfully.")
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  const handleResend = async () => {
    if (!phone) {
      setResendError("Phone number is required")
      return
    }
    
    setResendError(null)
    setIsResending(true)
    try {
      const result = await requestPhoneOtpAction({ phone })
      setResendState(result)
      // Set cooldown start time when OTP is successfully sent
      if (result.cooldown_seconds) {
        setCooldownStartTime(Math.floor(Date.now() / 1000))
      }
    } catch (error) {
      const resolved = resolveAuthError(error)
      setResendError(resolved.message)
    } finally {
      setIsResending(false)
    }
  }

  if (!isMounted) {
    return (
      <Card className="mx-auto w-full max-w-xl shadow-none">
        <CardHeader>
          <CardTitle>Enter verification code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium">{phone}</span>. Enter it below to verify your phone. Codes expire after 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-none">
      <CardHeader>
        <CardTitle>Enter verification code</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="font-medium">{phone}</span>. Enter it below to verify your phone. Codes expire after 5 minutes.
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
              {isPending ? "Verifying..." : "Verify phone"}
            </Button>
          </form>
        </Form>
        
        <Separator className="my-6" />
        
        <div className="space-y-3">
          <div className="space-y-2">
            {resendError ? <FormError message={resendError} /> : null}
            {resendState?.sent ? (
              <FormSuccess message="Code sent successfully. Please check your phone." />
            ) : null}
            {isCooldownActive && (
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/50 p-3">
                <p className="text-muted-foreground text-xs">
                  You can request another code in
                </p>
                <CountdownTimer
                  targetTimestamp={cooldownTargetTimestamp!}
                  enabled={true}
                  size="sm"
                  format="time"
                  animate={false}
                  className="text-foreground font-mono"
                />
              </div>
            )}
          </div>
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || isPending || isCooldownActive}
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
