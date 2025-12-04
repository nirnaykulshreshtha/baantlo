/**
 * @file page-structure.tsx
 * @description Shared building blocks that give application pages a polished, product-ready structure.
 * Provides a PageContainer gradient wrapper, a PageHeader hero card, and utility SectionTitle helpers.
 */

import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

type PageContainerProps = {
  children: ReactNode
  className?: string
  bleed?: boolean
}

/**
 * Wraps page content with subtle gradients and spacing so every screen feels intentional.
 */
export function PageContainer({ children, className, bleed }: PageContainerProps) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col gap-6 @container/page",
        bleed ? "mx-[-1rem] sm:mx-[-1.5rem]" : "",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 select-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background opacity-90" />
        <div className="absolute left-[-10%] top-[-20%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-5%] top-[8%] h-48 w-48 rounded-full bg-secondary/30 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col gap-6">{children}</div>
    </div>
  )
}

type PageHeaderStat = {
  label: string
  value: string
  hint?: string
  trend?: "up" | "down"
}

type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  stats?: PageHeaderStat[]
  className?: string
  align?: "start" | "center"
}

/**
 * Hero-style header card that carries the page title, description, optional actions, and quick metrics.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  stats,
  className,
  align = "start",
}: PageHeaderProps) {
  const hasStats = stats && stats.length > 0

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-card/80 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-90" />
        <div className="absolute left-[15%] top-[-35%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-[-20%] top-[35%] h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />
      </div>
      <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10">
        <div
          className={cn(
            "flex flex-col gap-6 md:flex-row md:items-start md:justify-between",
            align === "center" && "md:items-center",
          )}
        >
          <div className="max-w-2xl space-y-4">
            {eyebrow ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                {eyebrow}
              </div>
            ) : null}
            <div className={cn("space-y-3", align === "center" && "text-center md:text-left")}>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              {description ? (
                <p className="text-base text-muted-foreground sm:text-lg">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2 md:justify-start">{actions}</div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="mt-8 grid gap-4 @lg/page:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-b from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                  {stat.hint ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="size-3 text-emerald-500" />
                      ) : stat.trend === "down" ? (
                        <ArrowDownRight className="size-3 text-rose-500" />
                      ) : null}
                      <span>{stat.hint}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

type SectionTitleProps = {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * Section title helper for consistent subheading presentation.
 */
export function SectionTitle({ title, description, actions, className }: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  )
}
