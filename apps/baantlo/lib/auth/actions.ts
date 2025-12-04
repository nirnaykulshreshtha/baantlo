'use server'

import { auth } from "@/auth"
import {
  changePassword,
  forgotPassword,
  login,
  register,
  requestEmailOtp,
  requestEmailVerification,
  requestPhoneOtp,
  resetPassword,
  validateResetToken,
  verifyEmailOtp,
  verifyEmailToken,
  verifyPhoneOtp,
} from "@/lib/auth/api-client"

export async function loginAction(input: Parameters<typeof login>[0]) {
  return login(input)
}

export async function registerAction(input: Parameters<typeof register>[0]) {
  return register(input)
}

export async function requestEmailVerificationAction(
  input: Parameters<typeof requestEmailVerification>[0]
) {
  return requestEmailVerification(input)
}

export async function verifyEmailTokenAction(token: string) {
  return verifyEmailToken(token)
}

export async function requestEmailOtpAction(input: Parameters<typeof requestEmailOtp>[0]) {
  return requestEmailOtp(input)
}

export async function verifyEmailOtpAction(input: Parameters<typeof verifyEmailOtp>[0]) {
  return verifyEmailOtp(input)
}

export async function requestPhoneOtpAction(input: Parameters<typeof requestPhoneOtp>[0]) {
  return requestPhoneOtp(input)
}

export async function verifyPhoneOtpAction(input: Parameters<typeof verifyPhoneOtp>[0]) {
  return verifyPhoneOtp(input)
}

export async function forgotPasswordAction(input: Parameters<typeof forgotPassword>[0]) {
  return forgotPassword(input)
}

export async function validateResetTokenAction(token: string) {
  return validateResetToken(token)
}

export async function resetPasswordAction(input: Parameters<typeof resetPassword>[0]) {
  return resetPassword(input)
}

export async function changePasswordAction(input: Parameters<typeof changePassword>[1]) {
  const session = await auth()
  const accessToken = session?.accessToken
  if (!accessToken) {
    throw new Error("You must be signed in to change your password.")
  }
  return changePassword(accessToken, input)
}
