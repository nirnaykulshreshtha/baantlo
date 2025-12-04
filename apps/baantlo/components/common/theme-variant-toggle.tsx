"use client"

/**
 * @file theme-variant-toggle.tsx
 * @description Compact theme variant selector component that shows a dropdown menu
 * with all available theme variants. Designed for use in auth shells and minimal layouts.
 */

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Palette, Leaf, Sparkles, Crown, Check, GlassWater, Clock, Rainbow } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  themeVariantOptions,
  type ThemeVariant,
  DEFAULT_THEME_VARIANT,
} from "@/lib/preferences/theme-variant"
import { setThemeVariantPreference } from "@/lib/preferences/theme-variant-actions"

/**
 * Props for ThemeVariantToggle component.
 */
export type ThemeVariantToggleProps = {
  /** Currently active theme variant (should be fetched from server) */
  currentVariant?: ThemeVariant
  /** Optional className for styling */
  className?: string
  /** Variant for the button style */
  variant?: "ghost" | "outline" | "secondary"
  /** Size of the toggle button */
  size?: "default" | "sm" | "icon" | "icon-sm"
}

/**
 * Icon mapping for theme variant options.
 */
const variantIcons = {
  default: Palette,
  natural: Leaf,
  bubblegum: Sparkles,
  majestic: Crown,
  bourbon: GlassWater,
  perpetuity: Clock,
  brink: Rainbow,
} as const

/**
 * Compact theme variant selector with dropdown menu.
 * Shows the current variant icon and allows selection from all available variants.
 *
 * @param props.currentVariant - Currently active theme variant
 * @param props.className - Optional CSS classes
 * @param props.variant - Button variant (default: "ghost")
 * @param props.size - Button size (default: "icon-sm")
 */
export function ThemeVariantToggle({
  currentVariant = DEFAULT_THEME_VARIANT,
  className,
  variant = "ghost",
  size = "icon-sm",
}: ThemeVariantToggleProps) {
  const router = useRouter()
  const [value, setValue] = useState<ThemeVariant>(currentVariant)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setValue(currentVariant)
  }, [currentVariant])

  // Apply variant to HTML element via data attribute
  useEffect(() => {
    if (mounted && typeof document !== "undefined") {
      const html = document.documentElement
      html.removeAttribute("data-theme-variant")
      html.setAttribute("data-theme-variant", value)
    }
  }, [mounted, value])

  const handleSelect = (nextVariant: ThemeVariant) => {
    if (nextVariant === value || isPending) {
      return
    }

    startTransition(async () => {
      await setThemeVariantPreference(nextVariant)
      setValue(nextVariant)
      // Apply immediately to DOM
      if (typeof document !== "undefined") {
        const html = document.documentElement
        html.removeAttribute("data-theme-variant")
        html.setAttribute("data-theme-variant", nextVariant)
      }
      router.refresh()
    })
  }

  if (!mounted) {
    const DefaultIcon = variantIcons.default
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(className)}
        aria-label="Theme variant"
        disabled
      >
        <DefaultIcon className="h-4 w-4" />
      </Button>
    )
  }

  const CurrentIcon = variantIcons[value]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(className)}
          aria-label={`Current theme variant: ${themeVariantOptions.find((opt) => opt.value === value)?.label || value}. Click to change.`}
          disabled={isPending}
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themeVariantOptions.map((option) => {
          const OptionIcon = variantIcons[option.value]
          const isSelected = value === option.value

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={isPending}
              className="flex items-center gap-2 cursor-pointer"
            >
              <OptionIcon className="h-4 w-4" />
              <span className="flex-1">{option.label}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

