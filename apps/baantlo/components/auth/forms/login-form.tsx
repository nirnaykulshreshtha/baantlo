"use client"

/**
 * @file login-form.tsx
 * @description Modern, clean login form with email/password authentication.
 * Features a streamlined card-based design optimized for mobile-first experience.
 * 
 * Design principles:
 * - Minimal visual clutter
 * - Clear visual hierarchy
 * - Mobile-first responsive layout
 * - Accessible form controls
 * - Smooth error handling and verification flows
 */

import { useState, useTransition } from "react"
import { z } from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { LogIn, Phone, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
import { cn } from "@/lib/utils"

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
    <div className="w-full space-y-6">
      {/* Main Login Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="mt-1">Sign in to your account to continue</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email address</FormLabel>
                    <FormControl>
                      <EmailInput
                        placeholder="you@example.com"
                        {...field}
                      />
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
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <AuthLink
                        href="/forgot-password"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </AuthLink>
                    </div>
                    <FormControl>
                      <PasswordInput
                        placeholder="Enter your password"
                        showMeter={false}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && <FormError message={serverError} />}

              <Button
                type="submit"
                className="w-full text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Signing in...</span>
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Verification Flow */}
          {hasVerification && (
            <div className="mt-6 space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
              <VerificationBanner
                type={verification!.flow.action === "verify_phone" ? "phone" : "email"}
                message={verification!.flow.message}
              />
              {renderVerificationContent(verification!, {
                onRequestEmailVerification: handleRequestEmailVerification,
                onRequestPhoneOtp: handleRequestPhoneOtp,
              })}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border/50 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Don't have an account?</span>
            <AuthLink href="/register" className="font-medium text-primary hover:underline">
              Create one
            </AuthLink>
          </div>

          {/* Alternative Login Options */}
          <div className="flex w-full items-center gap-3 pt-2">
            <div className="flex-1 border-t border-border/50" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border/50" />
          </div>

          <div className="w-full">
            <AuthLink href="/verify-phone" className="w-full">
              <Button variant="outline" className="w-full">
                <Phone className="mr-2 h-4 w-4" />
                Sign in with phone
              </Button>
            </AuthLink>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Renders verification content based on the verification flow action.
 * Provides clean, accessible UI for email and phone verification steps.
 */
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
        <div className="space-y-3">
          <RequestEmailVerification
            email={flow.email ?? "your email"}
            onRequest={handlers.onRequestEmailVerification}
          />
          <div className="flex flex-col gap-2 pt-2 text-sm">
            <AuthLink
              href={`/verify-email${flow.email ? `?email=${encodeURIComponent(flow.email)}` : ""}`}
              className="text-primary hover:underline"
            >
              Have a verification token? Continue here
            </AuthLink>
            <AuthLink
              href={`/verify-email-otp${flow.email ? `?email=${encodeURIComponent(flow.email)}` : ""}`}
              className="text-primary hover:underline"
            >
              Verify via OTP instead
            </AuthLink>
          </div>
        </div>
      )
    case "verify_phone":
      return (
        <div className="space-y-3">
          <RequestPhoneOtp
            phone={flow.phone ?? "your phone"}
            onRequest={handlers.onRequestPhoneOtp}
          />
          <div className="pt-2">
            <AuthLink
              href={`/verify-phone${flow.phone ? `?phone=${encodeURIComponent(flow.phone)}` : ""}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Enter OTP now →
            </AuthLink>
          </div>
        </div>
      )
    default:
      return (
        <FormSuccess message={flow.message ?? "You are ready to sign in."} />
      )
  }
}
