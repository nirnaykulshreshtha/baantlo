"use client"

/**
 * @file layout-switcher.tsx
 * @description Client control allowing users to toggle between vertical and horizontal shells.
 */

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  layoutPreferenceOptions,
  type LayoutPreference,
} from "@/lib/preferences/layout"
import { setLayoutPreference } from "@/lib/preferences/layout-actions"
import { logComponentRender } from "@/lib/logging"

/**
 * Props accepted by LayoutSwitcher.
 */
export type LayoutSwitcherProps = {
  /** Currently active layout as determined on the server. */
  currentLayout: LayoutPreference
}

/**
 * Allows users to switch between vertical and horizontal navigation paradigms.
 */
export function LayoutSwitcher({ currentLayout }: LayoutSwitcherProps) {
  const router = useRouter()
  const [value, setValue] = useState<LayoutPreference>(currentLayout)
  const [isPending, startTransition] = useTransition()

  logComponentRender("LayoutSwitcher", { currentLayout })

  useEffect(() => {
    setValue(currentLayout)
  }, [currentLayout])

  const handleChange = (nextValue: string) => {
    if (nextValue !== "vertical" && nextValue !== "horizontal") {
      return
    }

    const nextPreference = nextValue as LayoutPreference
    if (nextPreference === value) {
      return
    }

    startTransition(async () => {
      await setLayoutPreference(nextPreference)
      setValue(nextPreference)
      router.refresh()
    })
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleChange}
      disabled={isPending}
      aria-label="Toggle global layout shell"
      className="bg-muted/50 rounded-full border p-1"
    >
      {layoutPreferenceOptions.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          <div className="flex flex-col px-2 text-left">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {option.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {option.description}
            </span>
          </div>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}


