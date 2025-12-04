'use client'

/**
 * @file phone-input.tsx
 * @description Styled phone input that enforces numeric keypad where supported.
 * Uses the unified FormInput component for consistent design language.
 */

import { forwardRef } from "react"
import { Phone } from "lucide-react"

import { FormInput } from "@/components/auth/form-input"
import type { FormInputProps } from "@/components/auth/form-input"

export type PhoneInputProps = Omit<FormInputProps, 'type' | 'leadingIcon'> & {
  /**
   * Whether to show the phone icon. Defaults to true.
   */
  showIcon?: boolean
}

/**
 * Phone input component with consistent spacing and design language.
 * Wraps FormInput with phone-specific defaults.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ showIcon = true, ...props }, ref) => {
    return (
      <FormInput
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        leadingIcon={showIcon ? Phone : undefined}
        showLeadingIcon={showIcon}
        {...props}
      />
    )
  }
)

PhoneInput.displayName = "PhoneInput"
