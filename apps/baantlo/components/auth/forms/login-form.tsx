'use client'

import { useState, useTransition } from "react"
import { z } from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { EmailInput } from "@/components/auth/email-input"
import { PasswordInput } from "@/components/auth/password-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { AuthLink } from "@/components/auth/auth-link"
import { VerificationBanner } from "@/components/auth/verification-banner"
import { RequestEmailVerification } from "@/components/auth/request-email-verification"
import { RequestPhoneOtp } from "@/components/auth/request-phone-otp"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { loginAction, requestEmailVerificationAction, requestPhoneOtpAction } from "@/lib/auth/actions"
import { resolveDefaultRedirectPath } from "@/lib/auth/constants"
import { VerificationFlow } from "@/lib/auth/types"
import { resolveAuthError } from "@/lib/auth/errors"
import { logLayoutEvent } from "@/lib/logging"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

type VerificationState = {
  flow: VerificationFlow
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackParam = searchParams.get("callbackUrl")

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [isSubmitting, startSubmit] = useTransition()

  const hasVerification = verification?.flow.action && verification.flow.action !== "issue_tokens"

  const handleSubmit = async (values: LoginValues) => {
    setServerError(null)
    startSubmit(async () => {
      try {
        const response = await loginAction(values)

        if (response.action === "issue_tokens" && response.session) {
          const redirectTarget =
            callbackParam ?? resolveDefaultRedirectPath(response.session.user)

          const result = await signIn("credentials", {
            email: values.email,
            password: values.password,
            session: JSON.stringify(response.session),
            redirect: false,
            callbackUrl: redirectTarget,
          })

          if (result?.error) {
            setServerError("Unable to start session. Please try again.")
            return
          }

          router.push(result?.url ?? redirectTarget)
          router.refresh()
          return
        }

        if (response.action !== "issue_tokens") {
          setVerification({ flow: response })
          logLayoutEvent("Auth", "login_verification_required", { action: response.action })
        }
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  const handleRequestEmailVerification = async () => {
    if (!verification?.flow.email) {
      throw new Error("Email address not available for verification.")
    }
    return requestEmailVerificationAction({ email: verification.flow.email })
  }

  const handleRequestPhoneOtp = async () => {
    if (!verification?.flow.phone) {
      throw new Error("Phone number not available for OTP.")
    }
    return requestPhoneOtpAction({ phone: verification.flow.phone })
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-none">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to access your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <EmailInput placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <AuthLink href="/forgot-password" className="text-xs">
                      Forgot password?
                    </AuthLink>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? <FormError message={serverError} /> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        {hasVerification ? <Separator /> : null}

        {hasVerification ? (
          <div className="space-y-4">
            <VerificationBanner
              type={verification!.flow.action === "verify_phone" ? "phone" : "email"}
              message={verification!.flow.message}
            />
            {renderVerificationContent(verification!, {
              onRequestEmailVerification: handleRequestEmailVerification,
              onRequestPhoneOtp: handleRequestPhoneOtp,
            })}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>Need an account?</span>
        <AuthLink href="/register">Create one</AuthLink>
      </CardFooter>
    </Card>
  )
}

function renderVerificationContent(
  state: VerificationState,
  handlers: {
    onRequestEmailVerification: () => Promise<any>
    onRequestPhoneOtp: () => Promise<any>
  }
) {
  const { flow } = state
  const { action } = flow

  switch (action) {
    case "verify_email":
      return (
        <div className="space-y-4">
          <RequestEmailVerification
            email={flow.email ?? "your email"}
            onRequest={handlers.onRequestEmailVerification}
          />
          <div className="flex flex-col items-start gap-2 text-sm">
            <AuthLink
              href={`/verify-email${flow.email ? `?email=${encodeURIComponent(flow.email)}` : ""}`}
              className="p-0"
            >
              Have a verification token? Continue here
            </AuthLink>
            <AuthLink
              href={`/verify-email-otp${flow.email ? `?email=${encodeURIComponent(flow.email)}` : ""}`}
              className="p-0"
            >
              Verify via OTP instead
            </AuthLink>
          </div>
        </div>
      )
    case "verify_phone":
      return (
        <div className="space-y-4">
          <RequestPhoneOtp
            phone={flow.phone ?? "your phone"}
            onRequest={handlers.onRequestPhoneOtp}
          />
          <AuthLink
            href={`/verify-phone${flow.phone ? `?phone=${encodeURIComponent(flow.phone)}` : ""}`}
            className="p-0"
          >
            Enter OTP now
          </AuthLink>
        </div>
      )
    default:
      return (
        <FormSuccess message={flow.message ?? "You are ready to sign in."} />
      )
  }
}
