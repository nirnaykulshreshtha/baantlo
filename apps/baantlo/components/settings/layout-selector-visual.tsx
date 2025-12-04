"use client"

/**
 * @file layout-selector-visual.tsx
 * @description Enhanced visual layout selector component with card-based UI and layout previews.
 * Provides a modern, interactive interface for selecting layout preferences with visual representations.
 */

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PanelLeft, PanelTop } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  layoutPreferenceOptions,
  type LayoutPreference,
} from "@/lib/preferences/layout"
import { setLayoutPreference } from "@/lib/preferences/layout-actions"
import { logComponentRender } from "@/lib/logging"

/**
 * Props accepted by LayoutSelectorVisual.
 */
export type LayoutSelectorVisualProps = {
  /** Currently active layout as determined on the server. */
  currentLayout: LayoutPreference
}

/**
 * Icon mapping for layout options.
 */
const layoutIcons = {
  vertical: PanelLeft,
  horizontal: PanelTop,
} as const

/**
 * Enhanced visual layout selector with card-based UI and layout previews.
 * Allows users to switch between vertical and horizontal layout preferences with visual feedback.
 */
export function LayoutSelectorVisual({
  currentLayout,
}: LayoutSelectorVisualProps) {
  const router = useRouter()
  const [value, setValue] = useState<LayoutPreference>(currentLayout)
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  logComponentRender("LayoutSelectorVisual", { currentLayout })

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setValue(currentLayout)
  }, [currentLayout])

  const handleSelect = (nextLayout: LayoutPreference) => {
    if (nextLayout === value || isPending) {
      return
    }

    startTransition(async () => {
      await setLayoutPreference(nextLayout)
      setValue(nextLayout)
      router.refresh()
    })
  }

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {layoutPreferenceOptions.map((option) => {
          const Icon = layoutIcons[option.value]
          return (
            <div
              key={option.value}
              className="group relative flex cursor-pointer flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <LayoutPreview layout={option.value} />
              <div className="text-sm font-medium">{option.label}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {layoutPreferenceOptions.map((option) => {
        const Icon = layoutIcons[option.value]
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
            aria-label={`Select ${option.label} layout`}
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

            <LayoutPreview layout={option.value} isSelected={isSelected} />

            <div className="text-sm font-medium">{option.label}</div>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Layout preview component showing a visual representation of the layout structure.
 */
function LayoutPreview({
  layout,
  isSelected = false,
}: {
  layout: LayoutPreference
  isSelected?: boolean
}) {
  if (layout === "vertical") {
    return (
      <div
        className={cn(
          "flex h-20 w-full items-center gap-2 rounded-md border bg-muted/30 p-2 transition-all",
          isSelected && "border-primary/50"
        )}
      >
        <div className="h-full w-12 rounded bg-primary/20" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2 rounded bg-muted-foreground/20" />
          <div className="h-2 w-3/4 rounded bg-muted-foreground/20" />
          <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
        </div>
      </div>
    )
  }

  // horizontal layout
  return (
    <div
      className={cn(
        "flex h-20 w-full flex-col gap-2 rounded-md border bg-muted/30 p-2 transition-all",
        isSelected && "border-primary/50"
      )}
    >
      <div className="h-6 w-full rounded bg-primary/20" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2 rounded bg-muted-foreground/20" />
        <div className="h-2 w-3/4 rounded bg-muted-foreground/20" />
        <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
      </div>
    </div>
  )
}

