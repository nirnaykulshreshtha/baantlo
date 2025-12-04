'use client'

/**
 * @file password-input.tsx
 * @description Password input with visibility toggle and optional strength meter.
 */

import { forwardRef, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type PasswordStrength = {
  value: number
  label: string
  tone: "destructive" | "warning" | "success"
}

export type PasswordInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  showMeter?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, value, showMeter = true, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false)
    const strength = useMemo(() => evaluateStrength(String(value ?? "")), [value])

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={ref}
            type={isVisible ? "text" : "password"}
            autoComplete="current-password"
            className={cn("pr-12", className)}
            value={value}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsVisible((prev) => !prev)}
            className="text-muted-foreground absolute right-1 top-1/2 -translate-y-1/2"
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
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
