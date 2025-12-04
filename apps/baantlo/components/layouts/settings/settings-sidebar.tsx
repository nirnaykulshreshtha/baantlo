"use client"

/**
 * @file settings-sidebar.tsx
 * @description Client-side secondary sidebar dedicated to the settings workspace. Provides
 * responsive navigation with aggressive logging for observability.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  type SettingsNavigationGroup,
  type SettingsNavigationEntry,
} from "@/lib/settings-navigation"
import { logComponentRender } from "@/lib/logging"
import { cn } from "@/lib/utils"

/**
 * Props wired into the SettingsSidebar component.
 */
export type SettingsSidebarProps = {
  /** Structured navigation groups rendered within the sidebar. */
  groups: SettingsNavigationGroup[]
  /** Title rendered within the sidebar header region. */
  title?: string
  /** Helper copy offering context for the settings experience. */
  description?: string
}

/**
 * Determines whether a navigation entry should be considered active for the current pathname.
 *
 * @param entry - Navigation entry under evaluation.
 * @param pathname - Current Next.js pathname (read from the router on the client).
 */
function isEntryActive(entry: SettingsNavigationEntry, pathname: string) {
  if (entry.href === "/settings") {
    return pathname === entry.href
  }

  return pathname.startsWith(entry.href)
}

/**
 * Secondary sidebar for settings pages that highlights the current route and surfaces grouped links.
 */
export function SettingsSidebar({
  groups,
  title = "Settings workspace",
  description = "Configure account and workspace behavior without leaving context.",
}: SettingsSidebarProps) {
  const pathname = usePathname()
  logComponentRender("SettingsSidebar", {
    pathname,
    groups: groups.map((group) => group.id),
  })

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card shadow-sm">
      <div className="space-y-1 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground/80">{description}</p>}
      </div>
      <Separator className="opacity-60" />
      <ScrollArea className="mt-2">
        <nav className="flex flex-col gap-6 px-4 pb-4">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.entries.map((entry) => {
                  const active = isEntryActive(entry, pathname)
                  return (
                    <li key={entry.id}>
                      <Link
                        href={entry.href}
                        className={cn(
                          "group flex flex-col gap-1 rounded-lg border border-transparent p-3 transition",
                          "hover:border-border hover:bg-muted/40",
                          active && "border-primary bg-primary/5 text-primary"
                        )}
                        aria-current={active ? "page" : undefined}
                        data-entry-id={entry.id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{entry.label}</span>
                          {entry.badge ? (
                            <Badge variant={active ? "default" : "secondary"}>
                              {entry.badge}
                            </Badge>
                          ) : null}
                        </div>
                        {entry.description ? (
                          <span className="text-xs text-muted-foreground">
                            {entry.description}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )
}


