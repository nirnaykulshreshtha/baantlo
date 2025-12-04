/**
 * @file empty-state.tsx
 * @description Shared empty state component for consistent visual treatments across the app.
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  subtle?: boolean
}

export function EmptyState({ icon, title, description, action, className, subtle }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-8 py-12 text-center transition-shadow",
        subtle
          ? "border-border/60 bg-muted/30"
          : "border-border/70 bg-background/80 shadow-inner",
        "hover:shadow-sm",
        className,
      )}
    >
      {icon ? <div className="grid size-12 place-items-center rounded-2xl bg-muted/70 text-muted-foreground">{icon}</div> : null}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
