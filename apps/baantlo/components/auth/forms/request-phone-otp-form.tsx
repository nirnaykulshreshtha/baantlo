'use client'

/**
 * @file request-phone-otp-form.tsx
 * @description Form component for requesting phone OTP verification.
 * This is the first step in the phone OTP verification flow.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PhoneInput } from "@/components/auth/phone-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { requestPhoneOtpAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"

const requestPhoneOtpSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
})

type RequestPhoneOtpValues = z.infer<typeof requestPhoneOtpSchema>

type RequestPhoneOtpFormProps = {
  initialPhone?: string
}

/**
 * Request Phone OTP Form Component
 * 
 * Allows users to enter their phone number and request an OTP code.
 * Upon successful request, navigates to the verification step.
 * 
 * @param initialPhone - Optional pre-filled phone number
 */
export function RequestPhoneOtpForm({ initialPhone = "" }: RequestPhoneOtpFormProps) {
  const router = useRouter()
  const form = useForm<RequestPhoneOtpValues>({
    resolver: zodResolver(requestPhoneOtpSchema),
    defaultValues: { phone: initialPhone },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (values: RequestPhoneOtpValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const response = await requestPhoneOtpAction({ phone: values.phone })
        
        // Navigate to verification step with phone in query params
        router.push(`/verify-phone?phone=${encodeURIComponent(values.phone)}&step=verify`)
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-none">
      <CardHeader>
        <CardTitle>Verify phone via OTP</CardTitle>
        <CardDescription>
          Enter your phone number to receive a verification code via SMS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="phone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <PhoneInput placeholder="Enter phone with country code" {...field} />
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

