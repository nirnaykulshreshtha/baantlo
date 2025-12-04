'use client'

/**
 * @file phone-input.tsx
 * @description Styled phone input that enforces numeric keypad where supported.
 */

import { forwardRef } from "react"
import { Phone } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type PhoneInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  showIcon?: boolean
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, showIcon = true, ...props }, ref) => {
    return (
      <div className="relative">
        {showIcon ? (
          <Phone className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" aria-hidden />
        ) : null}
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className={cn(showIcon ? "pl-9" : "", className)}
          {...props}
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"
