'use client'

/**
 * @file otp-input.tsx
 * @description Wrapper around shadcn InputOTP tailored for auth flows.
 */

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"

type OTPInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  className?: string
}

export function OtpInput({ value, onChange, length = 6, disabled, className }: OTPInputProps) {
  return (
    <InputOTP
      maxLength={length}
      value={value}
      onChange={onChange}
      containerClassName={cn("w-full justify-center", className)}
      disabled={disabled}
    >
      <InputOTPGroup className="gap-2">
        {Array.from({ length }).map((_, index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
