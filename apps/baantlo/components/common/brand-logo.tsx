"use client"

/**
 * @file brand-logo.tsx
 * @description Brand logo SVG component for Baant Lo application.
 * This component renders the official brand logo as a scalable SVG icon.
 * Can be used in headers, sidebars, and other branding contexts.
 */

import * as React from "react"
import { SVGProps, memo } from "react"
import { cn } from "@/lib/utils"

/**
 * Props for BrandLogo component.
 */
export type BrandLogoProps = SVGProps<SVGSVGElement> & {
  /** Optional className for styling */
  className?: string
}

/**
 * Renders the Baant Lo brand logo as an SVG component.
 * The logo features a layered document/paper stack design representing
 * expense tracking and settlement management.
 *
 * @param props - Standard SVG props plus optional className
 * @returns Memoized SVG component for optimal performance
 */
const BrandLogoSvg = (props: BrandLogoProps) => {
  const { className, ...svgProps } = props

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      style={{
        fillRule: "evenodd",
        clipRule: "evenodd",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeMiterlimit: 2,
      }}
      viewBox="0 0 64 64"
      className={cn("text-foreground", className)}
      {...svgProps}
    >
      <path
        d="M0 0h64v64H0z"
        style={{
          fill: "none",
        }}
      />
      <path
        d="M53.5 17.365c0-.754-.611-1.365-1.365-1.365h-29.27c-.754 0-1.365.611-1.365 1.365v36.223a1.366 1.366 0 0 0 2.068 1.171l4-2.4a1.366 1.366 0 0 1 1.24-.084l8.11 3.476c.369.158.789.145 1.148-.034l6.823-3.412a1.368 1.368 0 0 1 1.222 0l5.413 2.707a1.365 1.365 0 0 0 1.976-1.221V17.365z"
        style={{
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
        }}
      />
      <path
        d="m21.5 45-1.692-.725a1.366 1.366 0 0 0-1.24.084l-4 2.4a1.366 1.366 0 0 1-2.068-1.171V9.365c0-.754.611-1.365 1.365-1.365h29.27c.754 0 1.365.611 1.365 1.365V12"
        style={{
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
        }}
      />
      <path
        d="M40.524 20.713c1.98 1.499 1.966 4.859-.032 7.5-1.997 2.641-5.227 3.569-7.208 2.07-1.981-1.498-1.967-4.859.031-7.5s5.228-3.568 7.209-2.07z"
        style={{
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
        }}
      />
      <path
        d="M33.284 30.283s.804-3.211 3.717-4.084c2.912-.874 3.102-5.758 3.102-5.758M32 37h11m-11 5h11m-11 5h11"
        style={{
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
        }}
      />
    </svg>
  )
}

/**
 * Memoized brand logo component for optimal rendering performance.
 * Prevents unnecessary re-renders when parent components update.
 */
const BrandLogo = memo(BrandLogoSvg)

BrandLogo.displayName = "BrandLogo"

export default BrandLogo

