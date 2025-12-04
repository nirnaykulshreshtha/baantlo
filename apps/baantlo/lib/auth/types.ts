/**
 * @file types.ts
 * @description Shared Zod schemas and TypeScript types for authentication flows.
 */

import { z } from "zod"

export const AuthActionSchema = z.enum([
  "verify_phone",
  "verify_email",
  "do_login",
  "issue_tokens",
])

export type AuthAction = z.infer<typeof AuthActionSchema>

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  display_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_key: z.string().nullable().optional(),
  role: z.string(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  email_verified: z.boolean().optional(),
  phone_verified: z.boolean().optional(),
  preferred_currency: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  notifications_enabled: z.boolean().nullable().optional(),
  google_sub: z.string().nullable().optional(),
  apple_sub: z.string().nullable().optional(),
})

export type AuthUser = z.infer<typeof AuthUserSchema>

export const AuthSessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().int().nonnegative(),
  refresh_expires_in: z.number().int().nonnegative().optional(),
  user: AuthUserSchema,
})

export type AuthSession = z.infer<typeof AuthSessionSchema>

export const VerificationFlowSchema = z.object({
  action: AuthActionSchema,
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  message: z.string().optional(),
  session: AuthSessionSchema.optional(),
})

export type VerificationFlow = z.infer<typeof VerificationFlowSchema>

export const LoginResponseSchema = VerificationFlowSchema
export type LoginResponse = z.infer<typeof LoginResponseSchema>

export const EmailVerificationRequestSchema = z.object({
  sent: z.boolean(),
  cooldown_seconds: z.number().int().nonnegative().optional(),
  remaining_requests: z.number().int().nonnegative().optional(),
  email_masked: z.string().optional(),
  debug_code: z.string().optional(),
  message: z.string().optional(),
  action: AuthActionSchema.optional(),
})

export type EmailVerificationRequest = z.infer<typeof EmailVerificationRequestSchema>

export const PhoneVerificationRequestSchema = z.object({
  sent: z.boolean(),
  cooldown_seconds: z.number().int().nonnegative().optional(),
  remaining_requests: z.number().int().nonnegative().optional(),
  phone_masked: z.string().optional(),
  debug_code: z.string().optional(),
  message: z.string().optional(),
  action: AuthActionSchema.optional(),
})

export type PhoneVerificationRequest = z.infer<typeof PhoneVerificationRequestSchema>

export const PasswordResetValidationSchema = z.object({
  valid: z.boolean(),
  message: z.string(),
})

export type PasswordResetValidation = z.infer<typeof PasswordResetValidationSchema>

export const ResetPasswordResponseSchema = z.object({
  reset: z.boolean(),
})

export const ChangePasswordResponseSchema = z.object({
  changed: z.boolean(),
})

export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>

export const ForgotPasswordResponseSchema = z.object({
  sent: z.boolean(),
})

export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>

export const TokenRefreshResponseSchema = VerificationFlowSchema
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>
