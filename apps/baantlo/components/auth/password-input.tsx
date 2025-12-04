'use client'

/**
 * @file password-input.tsx
 * @description Password input with visibility toggle and optional strength meter.
 * Uses the unified FormInput component for consistent design language.
 */

import { forwardRef, useMemo } from "react"
import { Lock } from "lucide-react"

import { FormInput } from "@/components/auth/form-input"
import { Progress } from "@/components/ui/progress"
import type { FormInputProps } from "@/components/auth/form-input"

type PasswordStrength = {
  value: number
  label: string
  tone: "destructive" | "warning" | "success"
}

export type PasswordInputProps = Omit<FormInputProps, 'type' | 'leadingIcon'> & {
  /**
   * Whether to show the password strength meter. Defaults to true.
   */
  showMeter?: boolean
  
  /**
   * Whether to show the lock icon. Defaults to true.
   */
  showIcon?: boolean
}

/**
 * Password input component with automatic visibility toggle and optional strength meter.
 * Wraps FormInput with password-specific defaults including a lock icon.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ value, showMeter = true, showIcon = true, ...props }, ref) => {
    const strength = useMemo(() => evaluateStrength(String(value ?? "")), [value])

    return (
      <div className="space-y-2">
        <FormInput
          ref={ref}
          type="password"
          autoComplete="current-password"
          leadingIcon={showIcon ? Lock : undefined}
          showLeadingIcon={showIcon}
          {...props}
        />
        {showMeter ? (
          <div className="space-y-1.5">
            <Progress value={strength.value} className="h-2" />
            <p className="text-muted-foreground text-xs">{strength.label}</p>
          </div>
        ) : null}
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

function evaluateStrength(password: string): PasswordStrength {
  if (!password) {
    return { value: 0, label: "Enter a password to see its strength.", tone: "destructive" }
  }

  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 15
  if (/[A-Z]/.test(password)) score += 20
  if (/[a-z]/.test(password)) score += 15
  if (/\d/.test(password)) score += 15
  if (/[^A-Za-z0-9]/.test(password)) score += 10

  if (score >= 80) {
    return { value: Math.min(score, 100), label: "Strong password", tone: "success" }
  }
  if (score >= 50) {
    return { value: score, label: "Medium strength password", tone: "warning" }
  }
  return { value: Math.max(score, 15), label: "Weak password. Use more characters & symbols.", tone: "destructive" }
}
