"use client"

/**
 * @file sidebar-brand.tsx
 * @description Reusable brand/logo component for sidebar headers.
 * Can be used in both vertical sidebar and horizontal header contexts.
 */

import Link from "next/link"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import BrandLogo from "@/components/common/brand-logo"
import { motion } from "framer-motion"

/**
 * Props for SidebarBrand component.
 */
export type SidebarBrandProps = {
  /** Company/organization name */
  name?: string
  /** Subtitle or tagline */
  subtitle?: string
  /** URL for the brand link */
  href?: string
  /** Optional className for styling */
  className?: string
  /** Whether to render in compact mode (horizontal layout) */
  compact?: boolean
}

/**
 * Renders the brand/logo section for sidebar or header.
 * Displays company name, subtitle, and optional logo icon.
 * Brand name defaults to NEXT_PUBLIC_BRAND_NAME environment variable.
 *
 * @param props.name - Company name (defaults to NEXT_PUBLIC_BRAND_NAME env var or "Baant Lo")
 * @param props.subtitle - Subtitle or tagline (default: "Enterprise")
 * @param props.href - Link destination (default: "/")
 * @param props.className - Optional CSS classes
 * @param props.compact - Whether to render in compact mode
 */
export function SidebarBrand({
  name,
  subtitle = "Enterprise",
  href = "/",
  className,
  compact = false,
}: SidebarBrandProps) {
  // Get brand name from prop, environment variable, or fallback
  const brandName =
    name || process.env.NEXT_PUBLIC_BRAND_NAME || "Baant Lo"
  if (compact) {
    // Compact version for horizontal header
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors",
          className
        )}
      >
        <motion.span
          className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 group-hover:shadow-md p-1.5"
          style={{
            borderColor: "color-mix(in oklch, var(--sidebar-border) 70%, var(--sidebar-primary) 30%)",
            background: "color-mix(in oklch, var(--sidebar) 88%, var(--sidebar-primary) 12%)",
          }}
          whileHover={{ scale: 1.05, rotate: 6 }}
          whileTap={{ scale: 0.95 }}
        >
          <BrandLogo className="h-full w-full" />
        </motion.span>
        <span className="hidden font-bold text-xl sm:inline-block">{brandName}</span>
      </Link>
    )
  }

  // Full version for sidebar
  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href={href} className="group">
            <motion.span
              className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 group-hover:shadow-md p-1.5"
              style={{
                borderColor: "color-mix(in oklch, var(--sidebar-border) 70%, var(--sidebar-primary) 30%)",
                background: "color-mix(in oklch, var(--sidebar) 88%, var(--sidebar-primary) 12%)",
              }}
              whileHover={{ scale: 1.05, rotate: 6 }}
              whileTap={{ scale: 0.95 }}
            >
              <BrandLogo className="h-full w-full" />
            </motion.span>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{brandName}</span>
              <span className="truncate text-xs">{subtitle}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

