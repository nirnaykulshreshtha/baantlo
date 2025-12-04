"use client"

/**
 * @file auth-shell.tsx
 * @description Fully responsive authentication shell component that wraps all auth routes.
 * 
 * Features:
 * - Mobile-first responsive design with split layout on larger screens
 * - Marketing/features panel on left (hidden on mobile, shown on tablet+)
 * - Form content area on right (full width on mobile, constrained on desktop)
 * - Dynamic theme variant gradients
 * - Animated trust messages
 * - Theme controls in header
 * 
 * Layout behavior:
 * - Mobile (< 768px): Single column, form-first, minimal chrome
 * - Tablet (768px - 1024px): Split layout with reduced marketing panel
 * - Desktop (> 1024px): Full split layout with expanded marketing panel
 */

import { useEffect, useState } from "react"
import { ShieldCheck, Users, Sparkles, TrendingUp, Zap, CheckCircle2 } from "lucide-react"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { ThemeVariantToggle } from "@/components/common/theme-variant-toggle"
import BrandLogo from "@/components/common/brand-logo"
import { cn } from "@/lib/utils"
import { themeVariantOptions, type ThemeVariant } from "@/lib/preferences/theme-variant"

type Props = {
  title: string
  subtitle?: string
  children: React.ReactNode
  currentThemeVariant?: ThemeVariant
}

const features = [
  {
    title: "Split with ease",
    subtitle: "Split bills, Settle up in seconds",
    icon: TrendingUp,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Secure & private",
    subtitle: "Encryption keeps you safe",
    icon: ShieldCheck,
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "Smart insights",
    subtitle: "Reports and Spending analytics",
    icon: Zap,
    color: "from-purple-500/20 to-pink-500/20",
  },
]

const themeVariantGradients: Record<ThemeVariant, string> = {
  default: "linear-gradient(135deg,#4f46e5,#0ea5e9)",
  natural: "linear-gradient(135deg,#2f855a,#68d391)",
  bubblegum: "linear-gradient(135deg,#f472b6,#fb7185)",
  majestic: "linear-gradient(135deg,#a855f7,#c084fc)",
  bourbon: "linear-gradient(135deg,#bf4d24,#f97316)",
  perpetuity: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
  brink: "linear-gradient(135deg,#6366f1,#22d3ee)",
}

const trustMessages = [
  { text: "Trusted by thousands of flatmates across India", icon: Users },
  { text: "Privacy-first. Your data always stays yours", icon: ShieldCheck },
  { text: "Built for modern teams and groups", icon: Sparkles },
  { text: "Secure, reliable, and joyfully fast", icon: Zap },
]

/**
 * Fully responsive authentication shell component.
 * 
 * Provides a modern split-screen layout on larger devices with:
 * - Left panel: Marketing content, features, and trust messages
 * - Right panel: Authentication forms and content
 * 
 * On mobile devices, the layout stacks vertically with the form taking priority.
 * 
 * @param props.title - Main brand title
 * @param props.subtitle - Optional brand subtitle
 * @param props.children - Auth form content to render
 * @param props.currentThemeVariant - Current theme variant for gradient styling
 */
export default function AuthShell({ title, subtitle, children, currentThemeVariant = "default" }: Props) {
  const [trustIdx, setTrustIdx] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTrustIdx((prev) => (prev + 1) % trustMessages.length)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  const gradient = themeVariantGradients[currentThemeVariant] || themeVariantGradients.default

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header - Mobile-first, always visible */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-6 w-6 sm:h-7 sm:w-7" />
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold leading-tight sm:text-base">{title}</h1>
            {subtitle && (
              <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle variant="ghost" size="icon-sm" />
          <ThemeVariantToggle currentVariant={currentThemeVariant} variant="ghost" size="icon-sm" />
        </div>
      </header>

      {/* Main content area - Responsive split layout */}
      <main className="flex flex-1 flex-col lg:flex-row">
        {/* Marketing/Features Panel - Hidden on mobile, visible on tablet+ */}
        <aside
          className={cn(
            "hidden lg:flex lg:w-1/2 lg:flex-col",
            "relative overflow-hidden",
            "bg-background"
          )}
        >
          {/* Elegant background with sophisticated elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* Refined gradient accent on right edge */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2/5 opacity-[0.06]"
              style={{
                background: `linear-gradient(to left, ${gradient}, transparent)`,
              }}
            />
            
            {/* Elegant gradient orbs with smooth positioning */}
            <div
              className="absolute -right-1/4 top-1/3 h-[500px] w-[500px] rounded-full opacity-[0.12] blur-3xl transition-opacity duration-1000"
              style={{
                background: gradient,
              }}
            />
            <div
              className="absolute right-1/3 -bottom-1/4 h-[400px] w-[400px] rounded-full opacity-[0.08] blur-3xl transition-opacity duration-1000"
              style={{
                background: gradient,
              }}
            />
            
            {/* Subtle grid pattern for texture */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)]" />
            
            {/* Subtle dot pattern overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.02)_1px,transparent_0)] bg-[size:32px_32px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.02)_1px,transparent_0)] opacity-50" />
          </div>

          {/* Content container */}
          <div className="relative z-10 flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12 xl:px-12">
            {/* Elegant top section with refined divider */}
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-border/30" />
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Why choose us
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-border/30 via-border/60 to-transparent" />
              </div>
            </div>

            {/* Features Section with elegant spacing */}
            <div className="flex-1 space-y-5 max-w-lg mx-auto w-full">
              {features.map((feature, idx) => {
                const Icon = feature.icon
                return (
                  <div
                    key={idx}
                    className={cn(
                      "group relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-4",
                      "transition-all duration-500 ease-out",
                      "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                      "hover:bg-card/70 hover:-translate-y-0.5",
                      "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-primary/0 before:via-primary/0 before:to-primary/5",
                      "before:opacity-0 before:transition-opacity before:duration-500",
                      "hover:before:opacity-100"
                    )}
                  >
                    <div className="relative flex items-start gap-5">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-all duration-500 group-hover:scale-110 group-hover:from-primary/20 group-hover:to-primary/10">
                            <Icon className="h-6 w-6 transition-transform duration-500 group-hover:scale-110" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 pt-1">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary/90">
                          {feature.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground/90">
                          {feature.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Elegant bottom section - Trust message */}
            <div className="mt-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-border/30" />
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/40 bg-card/40">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-border/30 via-border/60 to-transparent" />
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-6 shadow-sm max-w-lg mx-auto w-full transition-all duration-500 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                {mounted && trustMessages[trustIdx] && (
                  <div
                    key={trustIdx}
                    className="flex items-center gap-5 transition-all duration-500 ease-in-out animate-slide-up-fade"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                        {(() => {
                          const TrustIcon = trustMessages[trustIdx].icon
                          return <TrustIcon className="h-5 w-5" />
                        })()}
                      </div>
                    </div>
                    <p className="flex-1 text-sm font-medium leading-relaxed text-foreground">
                      {trustMessages[trustIdx].text}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Form Content Area - Full width on mobile, constrained on desktop */}
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:w-1/2 lg:px-8 lg:py-12 xl:px-12 bg-muted/40">
          <div className="w-full max-w-lg space-y-6">
            {/* Auth form content */}
            <div className="w-full">{children}</div>
          </div>
        </section>
      </main>
    </div>
  )
}

