"use client"

/**
 * @file nav-user.tsx
 * @description User navigation component that works in both vertical (sidebar) and horizontal (header) layouts.
 * Provides user avatar, dropdown menu with account actions, and adapts styling based on context.
 */

import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import * as React from "react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { type UserData } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { logComponentRender, logLayoutEvent } from "@/lib/logging"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * Props for NavUser component.
 */
export type NavUserProps = {
  /** User data including name, email, and avatar */
  user: UserData
  /** Rendering variant: 'vertical' for sidebar, 'horizontal' for header */
  variant?: "vertical" | "horizontal"
  /** Optional className for styling */
  className?: string
}

/**
 * Renders user navigation with avatar and dropdown menu.
 * Adapts to both sidebar (vertical) and header (horizontal) contexts.
 *
 * @param props.user - User information (name, email, avatar)
 * @param props.variant - Layout variant: 'vertical' (default) or 'horizontal'
 * @param props.className - Optional CSS classes
 */
export function NavUser({
  user,
  variant = "vertical",
  className,
}: NavUserProps) {
  logComponentRender("NavUser", { variant, userName: user.name })

  // Use mobile detection hook that doesn't depend on sidebar context
  const isMobile = useIsMobile()

  // Vertical variant: renders in sidebar format
  if (variant === "vertical") {
    return (
      <SidebarMenu className={className}>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <UserDropdownContent user={user} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Horizontal variant: renders in header format
  return (
    <div className={cn("flex items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-accent"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-1 hidden md:block size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <UserDropdownContent user={user} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Shared dropdown menu content for user actions.
 * Used by both vertical and horizontal variants.
 * Provides links to Settings and Notifications, and a functional logout button.
 *
 * @param props.user - User information
 */
function UserDropdownContent({ user }: { user: UserData }) {
  /**
   * Handles user logout action.
   * Logs the event and signs out the user, redirecting to login page.
   */
  const handleLogout = async () => {
    logLayoutEvent("NavUser", "logout_clicked", {
      userName: user.name,
      userEmail: user.email,
    })

    try {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      })
    } catch (error) {
      logLayoutEvent("NavUser", "logout_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-lg">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
        <LogOut className="h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </>
  )
}
