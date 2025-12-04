'use client'

import { useState, useTransition } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { OtpInput } from "@/components/auth/otp-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { RequestEmailVerification } from "@/components/auth/request-email-verification"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { requestEmailOtpAction, verifyEmailOtpAction } from "@/lib/auth/actions"
import { resolveAuthError } from "@/lib/auth/errors"

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Enter the 6 digit code"),
})

type VerifyValues = z.infer<typeof verifySchema>

type VerifyEmailOtpFormProps = {
  initialEmail?: string
}

export function VerifyEmailOtpForm({ initialEmail = "" }: VerifyEmailOtpFormProps) {
  const form = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: initialEmail, code: "" },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (values: VerifyValues) => {
    setServerError(null)
    startTransition(async () => {
      try {
        const response = await verifyEmailOtpAction(values)
        setSuccess(response.message ?? "Email verified successfully.")
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  const handleResend = async () => {
    const email = form.getValues("email")
    if (!email) {
      throw new Error("Enter your email address first")
    }
    return requestEmailOtpAction({ email })
  }

  return (
    <Card className="mx-auto w-full max-w-xl shadow-none">
      <CardHeader>
        <CardTitle>Verify email via OTP</CardTitle>
        <CardDescription>Enter the latest code sent to your email address.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
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
              {isPending ? "Verifying..." : "Verify email"}
            </Button>
          </form>
        </Form>
        <RequestEmailVerification
          email={form.watch("email") || "your email"}
          onRequest={handleResend}
        />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Lost access to this email? Contact support for help.
      </CardFooter>
    </Card>
  )
}
