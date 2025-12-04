'use client'

import { useState, useTransition } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PhoneInput } from "@/components/auth/phone-input"
import { OtpInput } from "@/components/auth/otp-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { RequestPhoneOtp } from "@/components/auth/request-phone-otp"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { requestPhoneOtpAction, verifyPhoneOtpAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"

const verifyPhoneSchema = z.object({
  phone: z.string().min(10, "Enter your phone number"),
  code: z.string().length(6, "Enter the 6 digit code"),
})

type VerifyPhoneValues = z.infer<typeof verifyPhoneSchema>

type VerifyPhoneOtpFormProps = {
  initialPhone?: string
}

export function VerifyPhoneOtpForm({ initialPhone = "" }: VerifyPhoneOtpFormProps) {
  const form = useForm<VerifyPhoneValues>({
    resolver: zodResolver(verifyPhoneSchema),
    defaultValues: { phone: initialPhone, code: "" },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (values: VerifyPhoneValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const response = await verifyPhoneOtpAction(values)
        setSuccess(response.message ?? "Phone verified successfully.")
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  const handleResend = async () => {
    const phone = form.getValues("phone")
    if (!phone) {
      throw new Error("Enter your phone number first")
    }
    return requestPhoneOtpAction({ phone })
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-none">
      <CardHeader>
        <CardTitle>Verify phone via OTP</CardTitle>
        <CardDescription>Enter the code sent to your phone. Codes expire after 5 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <FormField
              name="code"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification code</FormLabel>
                  <FormControl>
                    <OtpInput value={field.value} onChange={field.onChange} />
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
        <RequestPhoneOtp
          phone={form.watch("phone") || "your phone"}
          onRequest={handleResend}
        />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Contact support if you are not receiving OTPs.
      </CardFooter>
    </Card>
  )
}
