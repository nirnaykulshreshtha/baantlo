'use client'

/**
 * @file email-input.tsx
 * @description Styled email input with optional leading icon.
 */

import { forwardRef } from "react"
import { Mail } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type EmailInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  showIcon?: boolean
}

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, showIcon = true, ...props }, ref) => {
    return (
      <div className="relative">
        {showIcon ? (
          <Mail className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" aria-hidden />
        ) : null}
        <Input
          ref={ref}
          type="email"
          autoComplete="email"
          inputMode="email"
          className={cn(showIcon ? "pl-9" : "", className)}
          {...props}
        />
      </div>
    )
  }
)

EmailInput.displayName = "EmailInput"
