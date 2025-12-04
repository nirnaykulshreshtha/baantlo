/**
 * Auth flow panel components for email-first and phone-first sections.
 * These provide reusable cards that can be composed by auth pages.
 */

import { cn } from "@/lib/utils"
import { Mail, Phone, Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthLink } from "@/components/auth/auth-link"
import React from "react"

type EmailFlowPanelProps = {
  /** Label to describe the channel (e.g., "Email + password"). */
  tag?: string
  /** Title displayed in the panel header. */
  title: string
  /** Optional subtitle to support the title. */
  subtitle?: string
  /** Optional action (button/link) rendered at the top right. */
  topAction?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function EmailFlowPanel({
  tag = "Email + password",
  title,
  subtitle,
  topAction,
  children,
  className,
}: EmailFlowPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-gradient-to-b from-background/60 to-background/30 p-6 shadow-[0_40px_120px_-35px_rgba(15,23,42,0.8)] backdrop-blur-2xl",
        "transition-shadow duration-300 hover:shadow-[0_50px_140px_-40px_rgba(59,130,246,0.45)]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-muted-foreground/70">{tag}</p>
            <h3 className="text-2xl font-semibold leading-tight text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground/90 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        {topAction && <div className="flex items-center">{topAction}</div>}
      </div>
      <div className="flex-1 space-y-4">{children}</div>
    </div>
  )
}

type MobileFlowPanelProps = {
  title?: string
  subtitle?: string
  accent?: string
  children: React.ReactNode
  className?: string
  ctaLabel?: string
  ctaHref?: string
}

export function MobileFlowPanel({
  title = "Phone-first access",
  subtitle = "Quick login with SMS OTPs",
  accent = "OTP-ready",
  children,
  className,
  ctaLabel = "Try phone login",
  ctaHref = "/verify-phone",
}: MobileFlowPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 to-slate-900/70 p-5 shadow-[0_30px_100px_-40px_rgba(59,130,246,0.7)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/20 p-2 text-primary">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground/70">{accent}</p>
            <h4 className="text-lg font-semibold">{title}</h4>
            <p className="text-xs text-muted-foreground/90">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
      <AuthLink href={ctaHref} className="self-start">
        <Button variant="outline" size="sm">
          {ctaLabel}
        </Button>
      </AuthLink>
    </div>
  )
}
