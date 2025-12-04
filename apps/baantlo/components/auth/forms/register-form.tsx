'use client'

/**
 * @file register-form.tsx
 * @description Multi-step registration form with stepper UI.
 * Fetches currencies from backend API and provides guided registration flow.
 * 
 * Steps:
 * 1. Account Details (Name, Email)
 * 2. Security (Password)
 * 3. Preferences & Terms (Phone, Currency, Terms acceptance)
 */

import { useState, useTransition, useEffect, useMemo } from "react"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmailInput } from "@/components/auth/email-input"
import { PasswordInput } from "@/components/auth/password-input"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { AuthLink } from "@/components/auth/auth-link"
import { VerificationBanner } from "@/components/auth/verification-banner"
import { RequestEmailVerification } from "@/components/auth/request-email-verification"
import { RequestPhoneOtp } from "@/components/auth/request-phone-otp"
import { FormStepper } from "@/components/auth/form-stepper"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { getSupportedCurrencies, type Currency } from "@/lib/currencies/api"

import {
  registerAction,
  requestEmailVerificationAction,
  requestPhoneOtpAction,
} from "@/lib/auth/actions"
import { resolveDefaultRedirectPath } from "@/lib/auth/constants"
import { VerificationFlow } from "@/lib/auth/types"
import { resolveAuthError } from "@/lib/auth/errors"

/**
 * Registration form schema matching backend API requirements.
 * 
 * Backend RegisterRequest schema:
 * - email: EmailStr (required)
 * - password: constr(min_length=8) (required)
 * - display_name: Optional[constr(min_length=1, max_length=64)]
 * - phone: Optional[constr(min_length=10, max_length=15)]
 * - preferred_currency: Optional[constr(min_length=3, max_length=3)]
 */
const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(1, "Name is required")
      .max(64, "Name must be at most 64 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z
      .string()
      .refine(
        (val) => {
          if (!val || val.trim().length === 0) return true
          if (!/^[\d+\-\s()]+$/.test(val)) return false
          const digitsOnly = val.replace(/[\s\-()+]/g, "")
          return digitsOnly.length >= 10 && digitsOnly.length <= 15
        },
        { message: "Phone number must be 10-15 digits" }
      )
      .optional()
      .or(z.literal("")),
    preferredCurrency: z
      .string()
      .length(3, "Currency code must be exactly 3 characters")
      .optional(),
    acceptTerms: z.boolean().refine((val) => val, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterValues = z.infer<typeof registerSchema>

type VerificationState = {
  flow: VerificationFlow
}

/**
 * Registration form steps configuration.
 */
const STEPS = [
  {
    title: "Account",
    description: "Basic information",
  },
  {
    title: "Security",
    description: "Password setup",
  },
  {
    title: "Complete",
    description: "Preferences & terms",
  },
] as const

const TOTAL_STEPS = STEPS.length

/**
 * Fields that must be validated for each step.
 */
const STEP_FIELDS: Record<number, Array<keyof RegisterValues>> = {
  0: ["displayName", "email"],
  1: ["password", "confirmPassword"],
  2: ["acceptTerms"],
}

/**
 * Registration form with multi-step stepper UI.
 * Provides guided registration flow with step-by-step validation.
 */
export function RegisterForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      preferredCurrency: undefined,
      acceptTerms: false,
    },
    mode: "onBlur",
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [verification, setVerification] = useState<VerificationState | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, startSubmit] = useTransition()

  const hasVerification = verification?.flow.action && verification.flow.action !== "issue_tokens"

  // Fetch currencies on mount
  useEffect(() => {
    let mounted = true

    async function loadCurrencies() {
      try {
        setIsLoadingCurrencies(true)
        const data = await getSupportedCurrencies()
        if (mounted) {
          setCurrencies(data)
          console.log("[RegisterForm] Loaded currencies:", data.length)
        }
      } catch (error) {
        console.error("[RegisterForm] Failed to load currencies:", error)
        if (mounted) {
          setCurrencies([])
        }
      } finally {
        if (mounted) {
          setIsLoadingCurrencies(false)
        }
      }
    }

    loadCurrencies()

    return () => {
      mounted = false
    }
  }, [])

  // Convert currencies to options format
  const currencyOptions = useMemo(
    () =>
      currencies.map((currency) => ({
        value: currency.code,
        label: `${currency.code} - ${currency.name} (${currency.symbol})`,
      })),
    [currencies]
  )

  /**
   * Validates fields for the current step.
   */
  const validateStep = async (step: number): Promise<boolean> => {
    const fields = STEP_FIELDS[step]
    if (!fields) return true

    const result = await form.trigger(fields)
    return result
  }

  /**
   * Handles next step navigation with validation.
   */
  const handleNext = async () => {
    const isValid = await validateStep(currentStep)
    if (isValid && currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1)
      setServerError(null)
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  /**
   * Handles previous step navigation.
   */
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setServerError(null)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  /**
   * Builds the registration payload matching backend API schema.
   */
  const buildPayload = (values: RegisterValues) => {
    const payload: {
      email: string
      password: string
      display_name: string
      phone?: string
      preferred_currency?: string
    } = {
      email: values.email,
      password: values.password,
      display_name: values.displayName,
    }

    if (values.phone?.trim()) {
      payload.phone = values.phone.trim()
    }

    if (values.preferredCurrency?.length === 3) {
      payload.preferred_currency = values.preferredCurrency
    }

    return payload
  }

  /**
   * Handles form submission.
   */
  const onSubmit = async (values: RegisterValues) => {
    setServerError(null)
    setSuccess(null)

    // Validate final step
    const isValid = await validateStep(currentStep)
    if (!isValid) {
      return
    }

    startSubmit(async () => {
      try {
        const payload = buildPayload(values)
        const response = await registerAction(payload)

        if (response.action === "issue_tokens" && response.session) {
          const redirectTarget = resolveDefaultRedirectPath(response.session.user)

          const result = await signIn("credentials", {
            email: values.email,
            password: values.password,
            session: JSON.stringify(response.session),
            redirect: false,
            callbackUrl: redirectTarget,
          })

          if (result?.error) {
            setServerError("Registration succeeded but automatic sign-in failed. Please sign in manually.")
          } else {
            router.push(result?.url ?? redirectTarget)
            router.refresh()
            return
          }
        }

        if (response.action !== "issue_tokens") {
          setVerification({ flow: response })
          setSuccess(response.message ?? "Verify your account to continue.")
        } else {
          setSuccess("Registration complete. Redirecting to your workspace...")
        }
      } catch (error) {
        const resolved = resolveAuthError(error)
        setServerError(resolved.message)
      }
    })
  }

  const handleRequestEmailVerification = async () => {
    if (!verification?.flow.email) {
      throw new Error("Email not available for verification.")
    }
    return requestEmailVerificationAction({ email: verification.flow.email })
  }

  const handleRequestPhoneOtp = async () => {
    if (!verification?.flow.phone) {
      throw new Error("Phone not available for OTP.")
    }
    return requestPhoneOtpAction({ phone: verification.flow.phone })
  }

  // Watch form values for review step
  const formValues = form.watch()

  return (
    <Card className="mx-auto w-full max-w-3xl shadow-none">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription className="mt-2">
            Join Baantlo and manage shared expenses effortlessly.
          </CardDescription>
        </div>
        <FormStepper steps={STEPS} currentStep={currentStep} />
      </CardHeader>

      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Account Details */}
            {currentStep === 0 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  name="displayName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          maxLength={64}
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        1-64 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
            )}

            {/* Step 2: Security */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-300">
                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="Create a secure password" autoFocus {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Must be at least 8 characters long
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="confirmPassword"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="Re-enter your password" showMeter={false} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Preferences & Terms */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in-50 duration-300">
                {/* Optional Preferences */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Optional Preferences</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      You can skip these and set them up later in your profile.
                    </p>
                  </div>

                  <FormField
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+919999999999"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d+\-\s()]/g, "")
                              field.onChange(value)
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          10-15 digits with country code
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="preferredCurrency"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred currency</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value === "" ? undefined : value)
                          }}
                          value={field.value || ""}
                          disabled={isLoadingCurrencies}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={isLoadingCurrencies ? "Loading currencies..." : "Select currency (defaults to INR)"}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencyOptions.length > 0 ? (
                              currencyOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No currencies available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Defaults to INR if not selected
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    name="acceptTerms"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="accept-terms"
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1.5 flex-1">
                            <FormLabel
                              htmlFor="accept-terms"
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              Accept terms & privacy policy
                            </FormLabel>
                            <FormDescription className="text-xs leading-relaxed">
                              By creating an account, you agree to Baantlo's Terms of Service and Privacy Policy.
                              You can update your preferences at any time.
                            </FormDescription>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Review Summary */}
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-3">Review your information</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{formValues.displayName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{formValues.email || "—"}</span>
                    </div>
                    {formValues.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{formValues.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">
                        {formValues.preferredCurrency || "INR (default)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error and Success Messages */}
            {serverError && <FormError message={serverError} />}
            {success && <FormSuccess message={success} />}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                className="min-w-[100px]"
              >
                Back
              </Button>
              {currentStep < TOTAL_STEPS - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              )}
            </div>
          </form>
        </Form>

        {/* Verification Flow */}
        {hasVerification && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <VerificationBanner
              type={verification!.flow.action === "verify_phone" ? "phone" : "email"}
              message={verification!.flow.message}
            />
            {verification!.flow.action === "verify_email" && (
              <RequestEmailVerification
                email={verification!.flow.email ?? "your email"}
                onRequest={handleRequestEmailVerification}
              />
            )}
            {verification!.flow.action === "verify_phone" && (
              <RequestPhoneOtp
                phone={verification!.flow.phone ?? "your phone"}
                onRequest={handleRequestPhoneOtp}
              />
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground border-t pt-6">
        Already have an account? <AuthLink href="/login">Sign in</AuthLink>
      </CardFooter>
    </Card>
  )
}
