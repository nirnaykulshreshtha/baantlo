'use client'

/**
 * @file email-input.tsx
 * @description Styled email input with optional leading icon.
 * Uses the unified FormInput component for consistent design language.
 */

import { forwardRef } from "react"
import { Mail } from "lucide-react"

import { FormInput } from "@/components/auth/form-input"
import type { FormInputProps } from "@/components/auth/form-input"

export type EmailInputProps = Omit<FormInputProps, 'type' | 'leadingIcon'> & {
  /**
   * Whether to show the email icon. Defaults to true.
   */
  showIcon?: boolean
}

/**
 * Email input component with consistent spacing and design language.
 * Wraps FormInput with email-specific defaults.
 */
export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ showIcon = true, ...props }, ref) => {
    return (
      <FormInput
        ref={ref}
        type="email"
        autoComplete="email"
        inputMode="email"
        leadingIcon={showIcon ? Mail : undefined}
        showLeadingIcon={showIcon}
        {...props}
      />
    )
  }
)

EmailInput.displayName = "EmailInput"
