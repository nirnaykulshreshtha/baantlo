"use client"

/**
 * @file app-sidebar.tsx
 * @description Vertical sidebar component that uses shared navigation data and reusable components.
 * Composes SidebarBrand, NavMain, and NavUser for a complete sidebar experience.
 */

import * as React from "react"

import { NavMain } from "@/components/common/nav-main"
import { NavUser } from "@/components/common/nav-user"
import { SidebarBrand } from "@/components/common/sidebar-brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { defaultNavigationData } from "@/lib/navigation"
import { logComponentRender } from "@/lib/logging"

/**
 * Props for AppSidebar component.
 */
export type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Optional custom navigation data (defaults to defaultNavigationData) */
  navigationData?: typeof defaultNavigationData
}

/**
 * Renders the application sidebar with brand, main navigation, and user menu.
 * Uses shared navigation data to ensure consistency across layout variants.
 *
 * @param props - Standard Sidebar component props plus optional navigationData
 */
export function AppSidebar({
  navigationData = defaultNavigationData,
  ...props
}: AppSidebarProps) {
  logComponentRender("AppSidebar", {
    itemCount: navigationData.navMain.length,
  })

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationData.navMain} variant="vertical" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navigationData.user} variant="vertical" />
      </SidebarFooter>
    </Sidebar>
  )
}
