"use client"

/**
 * @file dynamic-breadcrumbs.tsx
 * @description Dynamic breadcrumb component that automatically generates breadcrumbs
 * from the current route pathname. Uses the brand name from environment variables.
 * Provides intelligent path parsing and user-friendly label formatting.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { logComponentRender } from "@/lib/logging"
import { cn } from "@/lib/utils"

/**
 * Props for DynamicBreadcrumbs component.
 */
export type DynamicBreadcrumbsProps = {
  /** Optional brand name to show as first breadcrumb (defaults to env variable) */
  brandName?: string
  /** Optional className for styling */
  className?: string
  /** Whether to show the brand/home as first breadcrumb */
  showHome?: boolean
}

/**
 * Converts a URL path segment into a human-readable label.
 * Handles common patterns like camelCase, kebab-case, and underscores.
 *
 * @param segment - URL path segment (e.g., "user-settings", "appearance")
 * @returns Human-readable label (e.g., "User Settings", "Appearance")
 */
function formatSegmentLabel(segment: string): string {
  // Remove leading/trailing slashes and decode URL encoding
  const clean = decodeURIComponent(segment).trim()

  // Handle empty segments
  if (!clean) return ""

  // Replace common separators with spaces
  const withSpaces = clean
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Split camelCase

  // Capitalize first letter of each word
  return withSpaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Generates breadcrumb items from a pathname.
 * Splits the path into segments and creates breadcrumb entries.
 *
 * @param pathname - Current route pathname (e.g., "/settings/appearance")
 * @param brandName - Brand name to use as home label
 * @param showHome - Whether to include home breadcrumb
 * @returns Array of breadcrumb items with labels and hrefs
 */
function generateBreadcrumbs(
  pathname: string,
  brandName: string,
  showHome: boolean
): Array<{ label: string; href: string; isLast: boolean }> {
  // Filter out empty segments and remove query params
  const segments = pathname
    .split("?")[0] // Remove query params
    .split("/")
    .filter((segment) => segment.length > 0)

  const breadcrumbs: Array<{ label: string; href: string; isLast: boolean }> = []

  // Add home/brand breadcrumb if enabled
  if (showHome) {
    breadcrumbs.push({
      label: brandName,
      href: "/",
      isLast: segments.length === 0,
    })
  }

  // Generate breadcrumbs for each path segment
  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    breadcrumbs.push({
      label: formatSegmentLabel(segment),
      href: currentPath,
      isLast,
    })
  })

  return breadcrumbs
}

/**
 * Dynamic breadcrumb component that automatically generates breadcrumbs
 * from the current route pathname. Uses intelligent label formatting
 * and includes the brand name as the home breadcrumb.
 *
 * @param props.brandName - Optional brand name (defaults to NEXT_PUBLIC_BRAND_NAME env var)
 * @param props.className - Optional CSS classes
 * @param props.showHome - Whether to show home/brand breadcrumb (default: true)
 */
export function DynamicBreadcrumbs({
  brandName,
  className,
  showHome = true,
}: DynamicBreadcrumbsProps) {
  const pathname = usePathname()

  // Get brand name from props or environment variable
  const effectiveBrandName =
    brandName || process.env.NEXT_PUBLIC_BRAND_NAME || "Baant Lo"

  // Generate breadcrumbs from pathname
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(pathname, effectiveBrandName, showHome),
    [pathname, effectiveBrandName, showHome]
  )

  logComponentRender("DynamicBreadcrumbs", {
    pathname,
    breadcrumbCount: breadcrumbs.length,
    brandName: effectiveBrandName,
  })

  // Don't render if no breadcrumbs to show
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

