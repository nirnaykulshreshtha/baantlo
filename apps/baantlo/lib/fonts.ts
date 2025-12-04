/**
 * @file fonts.ts
 * @description Font configuration using Next.js next/font for optimal performance.
 * Defines fonts for different theme variants with proper optimization.
 */

import { Inter, Geist, Geist_Mono, Montserrat, Merriweather, Poppins, Lora, Source_Code_Pro, Fira_Code } from "next/font/google"
import type { ThemeVariant } from "@/lib/preferences/theme-variant"

/**
 * Default font stack - Geist (Vercel's font)
 */
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

/**
 * Natural theme fonts - Clean and modern
 */
export const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
})

export const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "700"],
})

export const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
})

/**
 * Bubblegum & Majestic theme fonts - Playful and elegant
 */
export const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
})

export const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

export const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
})

/**
 * Default/Perpetuity/Brink theme fonts - Professional
 */
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

/**
 * Font mapping for each theme variant
 */
export const themeVariantFonts: Record<ThemeVariant, {
  sans: { variable: string }
  serif: { variable: string }
  mono: { variable: string }
}> = {
  default: {
    sans: geistSans,
    serif: geistSans, // Using sans as fallback
    mono: geistMono,
  },
  natural: {
    sans: montserrat,
    serif: merriweather,
    mono: sourceCodePro,
  },
  bubblegum: {
    sans: poppins,
    serif: lora,
    mono: firaCode,
  },
  majestic: {
    sans: poppins,
    serif: lora,
    mono: firaCode,
  },
  bourbon: {
    sans: inter,
    serif: geistSans,
    mono: geistMono,
  },
  perpetuity: {
    sans: geistSans,
    serif: geistSans,
    mono: geistMono,
  },
  brink: {
    sans: geistSans,
    serif: geistSans,
    mono: geistMono,
  },
}

/**
 * Get all font variables for a specific theme variant
 */
export function getFontVariables(variant: ThemeVariant): string {
  const fonts = themeVariantFonts[variant]
  return `${fonts.sans.variable} ${fonts.serif.variable} ${fonts.mono.variable}`.trim()
}

/**
 * Get all font class names for applying to HTML element
 * This includes all fonts so they're available for theme switching
 */
export function getAllFontVariables(): string {
  return [
    geistSans.variable,
    geistMono.variable,
    montserrat.variable,
    merriweather.variable,
    sourceCodePro.variable,
    poppins.variable,
    lora.variable,
    firaCode.variable,
    inter.variable,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
}

