'use client'

/**
 * @file form-input.tsx
 * @description Unified form input component with consistent spacing, icons, and design language.
 * 
 * Features:
 * - Consistent spacing across all forms
 * - Optional leading icon (left side)
 * - Optional trailing action (right side, e.g., password toggle)
 * - Automatic password visibility toggle when type="password"
 * - Full compatibility with react-hook-form and shadcn Form components
 * - Accessible with proper ARIA labels
 * - Consistent styling with existing design system
 * 
 * Design specifications:
 * - Icon size: h-4 w-4 (16px)
 * - Icon position: left-3 top-1/2 -translate-y-1/2 (12px from left, vertically centered)
 * - Padding with icon: pl-9 (36px left padding)
 * - Padding with trailing action: pr-12 (48px right padding)
 * - Label: text-sm font-medium
 * - Consistent border, focus states, and error states
 */

import { forwardRef, useState, type ReactNode } from "react"
import { Eye, EyeOff, type LucideIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type FormInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'> & {
  /**
   * Input type. When "password", automatically shows visibility toggle.
   */
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'search'
  
  /**
   * Optional leading icon (left side of input).
   * Can be a Lucide icon component or any React node.
   */
  leadingIcon?: LucideIcon | ReactNode
  
  /**
   * Optional trailing action (right side of input).
   * When provided, adds right padding to make room for the action.
   * For password inputs, this is automatically the visibility toggle.
   */
  trailingAction?: ReactNode
  
  /**
   * Whether to show the leading icon. Defaults to true if leadingIcon is provided.
   */
  showLeadingIcon?: boolean
  
  /**
   * Custom icon size. Defaults to h-4 w-4.
   */
  iconSize?: string
}

/**
 * Unified form input component with consistent design language.
 * 
 * @example
 * ```tsx
 * // Basic text input
 * <FormInput placeholder="Enter your name" />
 * 
 * // Email input with icon
 * <FormInput 
 *   type="email" 
 *   leadingIcon={Mail} 
 *   placeholder="you@example.com" 
 * />
 * 
 * // Password input (auto-shows toggle)
 * <FormInput 
 *   type="password" 
 *   placeholder="Enter your password" 
 * />
 * 
 * // Custom trailing action
 * <FormInput 
 *   leadingIcon={Search}
 *   trailingAction={<Button variant="ghost">Clear</Button>}
 * />
 * ```
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      className,
      type = 'text',
      leadingIcon,
      trailingAction,
      showLeadingIcon = leadingIcon !== undefined,
      iconSize = 'h-4 w-4',
      ...props
    },
    ref
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const isPassword = type === 'password'
    
    // Determine actual input type
    const inputType = isPassword && isPasswordVisible ? 'text' : type
    
    // Auto-generate password toggle if type is password and no custom trailing action
    const effectiveTrailingAction = isPassword && !trailingAction ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsPasswordVisible((prev) => !prev)}
        className="text-muted-foreground"
        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
      >
        {isPasswordVisible ? (
          <EyeOff className={iconSize} />
        ) : (
          <Eye className={iconSize} />
        )}
      </Button>
    ) : trailingAction

    // Determine padding classes
    const hasLeadingIcon = showLeadingIcon && leadingIcon
    const hasTrailingAction = effectiveTrailingAction !== undefined
    
    const paddingClasses = cn(
      hasLeadingIcon && "pl-9",
      hasTrailingAction && "pr-12"
    )

    // Render leading icon
    const renderLeadingIcon = () => {
      if (!hasLeadingIcon) return null
      
      // Check if it's a React component (function or class component)
      const isComponent = typeof leadingIcon === 'function' || 
                         (leadingIcon && typeof leadingIcon === 'object' && 'render' in leadingIcon)
      
      if (isComponent) {
        // It's a Lucide icon component or React component
        const IconComponent = leadingIcon as LucideIcon
        return (
          <IconComponent 
            className={cn(
              "text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2",
              iconSize
            )} 
            aria-hidden 
          />
        )
      }
      
      // It's a custom React node (element, string, etc.)
      return (
        <div className={cn("absolute left-3 top-1/2 -translate-y-1/2 flex items-center", iconSize)} aria-hidden>
          {leadingIcon}
        </div>
      )
    }

    return (
      <div className="relative">
        {renderLeadingIcon()}
        <Input
          ref={ref}
          type={inputType}
          className={cn(
            paddingClasses,
            className
          )}
          {...props}
        />
        {hasTrailingAction && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            {effectiveTrailingAction}
          </div>
        )}
      </div>
    )
  }
)

FormInput.displayName = "FormInput"

