"use client"

/**
 * @file theme-toggle.tsx
 * @description Minimal theme toggle component that cycles through light, dark, and system themes.
 * Designed for use in auth shells and other minimal layouts where a compact toggle is needed.
 */

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Props for ThemeToggle component.
 */
export type ThemeToggleProps = {
  /** Optional className for styling */
  className?: string
  /** Variant for the button style */
  variant?: "ghost" | "outline" | "secondary"
  /** Size of the toggle button */
  size?: "default" | "sm" | "icon" | "icon-sm"
}

/**
 * Minimal theme toggle that cycles through light, dark, and system themes.
 * Shows appropriate icon based on current theme and provides smooth transitions.
 *
 * @param props.className - Optional CSS classes
 * @param props.variant - Button variant (default: "ghost")
 * @param props.size - Button size (default: "icon-sm")
 */
export function ThemeToggle({
  className,
  variant = "ghost",
  size = "icon-sm",
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(className)}
        aria-label="Toggle theme"
        disabled
      >
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  // Show Monitor icon when theme is "system", otherwise show Sun/Moon based on resolved theme
  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun

  return (
    <Button
      variant={variant}
      size={size}
      onClick={cycleTheme}
      className={cn(className)}
      aria-label={`Switch to ${theme === "light" ? "dark" : theme === "dark" ? "system" : "light"} theme`}
      title={`Current: ${theme === "system" ? "System" : theme === "light" ? "Light" : "Dark"}. Click to switch.`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

