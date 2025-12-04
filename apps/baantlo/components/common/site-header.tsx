"use client"

import { type ReactNode } from "react"
import { SidebarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { DynamicBreadcrumbs } from "@/components/common/dynamic-breadcrumbs"

/**
 * Props supported by SiteHeader.
 */
export type SiteHeaderProps = {
  /** Optional region rendered on the right-hand side of the header. */
  actions?: ReactNode
}

export function SiteHeader({ actions }: SiteHeaderProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <div className="flex flex-1 items-center gap-2">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <SidebarIcon />
          </Button>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="hidden flex-1 sm:block">
            <DynamicBreadcrumbs />
          </div>
        </div>
        {actions ? (
          <div className="flex items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
