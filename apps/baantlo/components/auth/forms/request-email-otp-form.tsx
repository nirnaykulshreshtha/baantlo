'use client'

/**
 * @file request-email-otp-form.tsx
 * @description Form component for requesting email OTP verification.
 * This is the first step in the email OTP verification flow.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { EmailInput } from "@/components/auth/email-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { requestEmailOtpAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"

const requestEmailOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type RequestEmailOtpValues = z.infer<typeof requestEmailOtpSchema>

type RequestEmailOtpFormProps = {
  initialEmail?: string
}

/**
 * Request Email OTP Form Component
 * 
 * Allows users to enter their email address and request an OTP code.
 * Upon successful request, navigates to the verification step.
 * 
 * @param initialEmail - Optional pre-filled email address
 */
export function RequestEmailOtpForm({ initialEmail = "" }: RequestEmailOtpFormProps) {
  const router = useRouter()
  const form = useForm<RequestEmailOtpValues>({
    resolver: zodResolver(requestEmailOtpSchema),
    defaultValues: { email: initialEmail },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (values: RequestEmailOtpValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const response = await requestEmailOtpAction({ email: values.email })
        
        // Navigate to verification step with email in query params
        router.push(`/verify-email-otp?email=${encodeURIComponent(values.email)}&step=verify`)
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-none">
      <CardHeader>
        <CardTitle>Verify email via OTP</CardTitle>
        <CardDescription>
          Enter your email address to receive a verification code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <EmailInput placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? <FormError message={serverError} /> : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending code..." : "Send verification code"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

