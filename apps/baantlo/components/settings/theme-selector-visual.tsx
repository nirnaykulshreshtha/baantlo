"use client"

/**
 * @file theme-selector-visual.tsx
 * @description Enhanced visual theme selector component with card-based UI for appearance settings.
 * Provides a modern, interactive interface for selecting theme preferences with visual previews.
 */

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  themePreferenceOptions,
  type ThemePreference,
} from "@/lib/preferences/theme"
import { setThemePreference } from "@/lib/preferences/theme-actions"
import { logComponentRender } from "@/lib/logging"

/**
 * Props accepted by ThemeSelectorVisual.
 */
export type ThemeSelectorVisualProps = {
  /** Currently active theme as determined on the server. */
  currentTheme: ThemePreference
}

/**
 * Icon mapping for theme options.
 */
const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

/**
 * Enhanced visual theme selector with card-based UI.
 * Allows users to switch between light, dark, and system theme preferences with visual feedback.
 */
export function ThemeSelectorVisual({ currentTheme }: ThemeSelectorVisualProps) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [value, setValue] = useState<ThemePreference>(currentTheme)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const lastAppliedTheme = useRef<ThemePreference | null>(null)

  logComponentRender("ThemeSelectorVisual", { currentTheme })

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setValue(currentTheme)
  }, [currentTheme])

  // Sync with next-themes when mounted
  useEffect(() => {
    if (!mounted) {
      return
    }

    if (lastAppliedTheme.current === value) {
      return
    }

    lastAppliedTheme.current = value
    setTheme(value)
  }, [mounted, value, setTheme])

  const handleSelect = (nextValue: ThemePreference) => {
    if (nextValue === value || isPending) {
      return
    }

    startTransition(async () => {
      await setThemePreference(nextValue)
      setTheme(nextValue)
      setValue(nextValue)
      router.refresh()
    })
  }

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {themePreferenceOptions.map((option) => {
          const Icon = themeIcons[option.value]
          return (
            <div
              key={option.value}
              className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
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
      {themePreferenceOptions.map((option) => {
        const Icon = themeIcons[option.value]
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={isPending}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border p-6 transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/50 hover:shadow-md",
              isPending && "opacity-50 cursor-not-allowed"
            )}
            aria-label={`Select ${option.label} theme`}
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

            <div className="text-sm font-medium">{option.label}</div>
          </button>
        )
      })}
    </div>
  )
}
