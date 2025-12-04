"use client"

/**
 * @file theme-variant-selector-visual.tsx
 * @description Enhanced visual theme variant selector component with card-based UI and color previews.
 * Provides a modern, interactive interface for selecting theme variant preferences with visual color swatches.
 */

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Palette, Leaf, Sparkles, Crown, Clock, GlassWater, Rainbow } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  themeVariantOptions,
  type ThemeVariant,
} from "@/lib/preferences/theme-variant"
import { setThemeVariantPreference } from "@/lib/preferences/theme-variant-actions"
import { logComponentRender } from "@/lib/logging"

/**
 * Props accepted by ThemeVariantSelectorVisual.
 */
export type ThemeVariantSelectorVisualProps = {
  /** Currently active theme variant as determined on the server. */
  currentVariant: ThemeVariant
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
 * Color preview palettes for each variant.
 * These reference CSS custom properties so the actual values stay defined in stylesheets.
 */
const previewColorVariables = {
  default: ["--primary", "--secondary", "--ring"],
  natural: ["--primary", "--secondary", "--accent"],
  bubblegum: ["--primary", "--secondary", "--accent"],
  majestic: ["--primary", "--secondary", "--accent"],
  bourbon: ["--primary", "--secondary", "--accent"],
  perpetuity: ["--primary", "--secondary", "--accent"],
  brink: ["--primary", "--secondary", "--accent"],
} as const satisfies Record<ThemeVariant, readonly string[]>

/**
 * Enhanced visual theme variant selector with card-based UI and color previews.
 * Allows users to switch between different theme variants with immediate visual feedback.
 */
export function ThemeVariantSelectorVisual({
  currentVariant,
}: ThemeVariantSelectorVisualProps) {
  const router = useRouter()
  const [value, setValue] = useState<ThemeVariant>(currentVariant)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  logComponentRender("ThemeVariantSelectorVisual", { currentVariant })

  // Handle hydration
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
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {themeVariantOptions.map((option) => {
          const Icon = variantIcons[option.value]
          const colorVariables = previewColorVariables[option.value]
          return (
            <div
              key={option.value}
              className="group relative flex cursor-pointer flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex gap-2" data-theme-variant={option.value}>
                {colorVariables.map((cssVar) => (
                  <div
                    key={cssVar}
                    className="h-8 w-8 rounded-full border-2 border-border"
                  >
                    <div
                      className="h-full w-full rounded-full"
                      style={{ backgroundColor: `var(${cssVar})` }}
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium">{option.label}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      {themeVariantOptions.map((option) => {
        const Icon = variantIcons[option.value]
        const colorVariables = previewColorVariables[option.value]
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={isPending}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center gap-4 rounded-lg border p-6 transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/50 hover:shadow-md",
              isPending && "opacity-50 cursor-not-allowed"
            )}
            aria-label={`Select ${option.label} variant`}
            aria-pressed={isSelected}
            aria-busy={isPending}
          >
            {isSelected && (
              <div className="absolute right-3 top-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
              )}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="flex gap-2" data-theme-variant={option.value}>
              {colorVariables.map((cssVar) => (
                <div
                  key={cssVar}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    isSelected
                      ? "border-primary shadow-sm scale-105"
                      : "border-border group-hover:border-primary/50"
                  )}
                >
                  <div
                    className="h-full w-full rounded-full"
                    style={{ backgroundColor: `var(${cssVar})` }}
                  />
                </div>
              ))}
            </div>

            <div className="text-sm font-medium">{option.label}</div>
          </button>
        )
      })}
    </div>
  )
}
