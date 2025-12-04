/**
 * AuthShell Component for Baant Lo Application
 * 
 * This component provides a beautiful, modern authentication layout with:
 * - Split-screen design with branding on the left
 * - Form content on the right
 * - Animated trust messages
 * - Feature highlights
 * - Responsive design for mobile and desktop
 * - Modern glassmorphism effects
 * - Fully theme-dependent design using CSS variables that adapt to theme variants
 * - Dynamic colors that change with theme variants (default, natural, bubblegum, majestic)
 * - Minimal theme and theme variant toggles in top-right corner (form side only)
 * - Consistent with application design system
 * 
 * @author Baantlo Development Team
 * @created 2025-01-27
 * @updated 2025-01-27
 */

"use client";

import React, { useMemo, useEffect, useState } from "react";
import { ShieldCheck, Users, Wallet, Sparkles } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { ThemeVariantToggle } from "@/components/common/theme-variant-toggle";
import BrandLogo from "@/components/common/brand-logo";
import type { ThemeVariant } from "@/lib/preferences/theme-variant";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentThemeVariant?: ThemeVariant;
};

/**
 * AuthShell Component
 * 
 * Provides a modern authentication layout with split-screen design,
 * branding, feature highlights, and animated trust messages.
 * 
 * @param title - The main title for the auth page
 * @param subtitle - Optional subtitle text
 * @param children - The form content to render
 * @param currentThemeVariant - Current theme variant preference
 * @returns The authentication shell layout
 */
export default function AuthShell({ title, subtitle, children, currentThemeVariant }: Props) {
  const trustMessages = useMemo(
    () => [
      "Trusted by thousands of flatmates across India",
      "Privacy-first. Your data stays yours",
      "Fast, reliable, and secure bill splitting",
      "Seamless expense tracking and settlements",
    ],
    [],
  );

  const featureHighlights = useMemo(
    () => [
      {
        icon: Users,
        title: "Split bills",
        subtitle: "Create groups & settle instantly",
        delay: 0.1,
      },
      {
        icon: Wallet,
        title: "Track expenses",
        subtitle: "Smart categories & reminders",
        delay: 0.2,
      },
      {
        icon: ShieldCheck,
        title: "Secure settling",
        subtitle: "Bank-grade protection",
        delay: 0.3,
      },
    ],
    [],
  );

  const accentStyles = useMemo(
    () =>
      ({
        "--auth-shell-flare-1": "color-mix(in oklch, var(--color-primary) 32%, transparent)",
        "--auth-shell-flare-2": "color-mix(in oklch, var(--color-accent) 26%, transparent)",
        "--auth-shell-flare-3": "color-mix(in oklch, var(--color-secondary) 20%, transparent)",
        "--auth-shell-surface": "color-mix(in oklch, var(--color-card) 88%, var(--color-primary) 12%)",
        "--auth-shell-surface-soft":
          "color-mix(in oklch, var(--color-card) 82%, var(--color-secondary) 18%)",
        "--auth-shell-ring": "color-mix(in oklch, var(--color-border) 70%, var(--color-primary) 30%)",
      }) as React.CSSProperties,
    [],
  );

  const [trustIdx, setTrustIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTrustIdx((v) => (v + 1) % trustMessages.length);
    }, 3000);
    return () => clearInterval(id);
  }, [trustMessages.length]);

  return (
    <div className="min-h-screen bg-background text-foreground" style={accentStyles}>
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Marketing / Left Panel */}
        <div className="relative hidden overflow-hidden lg:flex">
          <div
            className="absolute inset-0 opacity-95"
            style={{
              background:
                "radial-gradient(140% 120% at -20% -20%, var(--auth-shell-flare-1) 0%, transparent 70%), radial-gradient(120% 120% at 110% -10%, var(--auth-shell-flare-2) 0%, transparent 72%), radial-gradient(120% 140% at 50% 115%, var(--auth-shell-flare-3) 0%, transparent 80%)",
            }}
          />
          <div className="absolute inset-0 bg-card/80 backdrop-blur-[60px]" />
          {/* Theme-aware gradient overlay for left panel - visible in both light and dark */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/30 via-muted/15 to-muted/8 dark:from-background/10 dark:via-background/5 dark:to-background/7" />
          <div
            className="absolute inset-y-0 right-0 w-px opacity-50"
            style={{
              background: "linear-gradient(to bottom, transparent, hsl(var(--border)), transparent)",
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between px-12 pb-14 pt-16 xl:px-16 xl:pt-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Link
                href="/"
                className="group flex items-center gap-3 text-card-foreground transition-colors hover:text-foreground"
              >
                <motion.span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 group-hover:shadow-md p-1.5"
                  whileHover={{ scale: 1.05, rotate: 6 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BrandLogo className="h-full w-full" />
                </motion.span>
                <div className="text-lg font-semibold tracking-tight sm:text-xl">
                  {process.env.NEXT_PUBLIC_BRAND_NAME || "Baant Lo"}
                </div>
              </Link>
            </motion.div>

            <motion.div
              className="mt-16 space-y-6"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
            >
              <motion.span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em]"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.24 }}
              >
                <motion.span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                Early access
              </motion.span>

              <div className="space-y-4">
                <h1 className="text-balance text-[clamp(2.2rem,2.8vw,2.85rem)] font-semibold leading-tight tracking-tight text-card-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground/90">
                    {subtitle}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
            >
              {featureHighlights.map((feature) => (
                <motion.div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + feature.delay }}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "var(--auth-shell-surface-soft)" }}
                  >
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm font-semibold tracking-tight text-card-foreground">
                    {feature.title}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground/90">
                    {feature.subtitle}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-12 flex items-center gap-3 border-t pt-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.52 }}
            >
              <motion.div
                className="flex h-9 w-9 items-center justify-center rounded-full border shadow-sm"
                whileHover={{ scale: 1.05, rotate: 4 }}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </motion.div>
              <div className="relative h-6 flex-1 overflow-hidden text-xs font-medium text-muted-foreground">
              <AnimatePresence mode="wait">
                <motion.div
                  key={trustIdx}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 0.9, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {trustMessages[trustIdx]}
                </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Form / Right Panel */}
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-14 sm:px-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(110% 140% at 100% 0%, var(--auth-shell-flare-2) 0%, transparent 70%), radial-gradient(120% 120% at 0% 100%, var(--auth-shell-flare-1) 0%, transparent 75%)",
            }}
          />
          {/* Theme-aware gradient overlay for right panel - visible in both light and dark */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/30 via-muted/15 to-muted/8 dark:from-background/10 dark:via-background/5 dark:to-background/7" />

          <motion.div
            className="absolute top-4 right-4 z-20 flex items-center gap-2 sm:top-8 sm:right-8"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <ThemeVariantToggle currentVariant={currentThemeVariant} variant="ghost" size="icon-sm" />
            <ThemeToggle variant="ghost" size="icon-sm" />
          </motion.div>

          <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 py-4 sm:px-2 lg:px-2">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
