"use client"

/**
 * @file top-navigation.tsx
 * @description Client component rendering the horizontal navigation menu with active route awareness.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { type AppNavigationItem } from "@/lib/navigation"
import { logComponentRender } from "@/lib/logging"
import { cn } from "@/lib/utils"

/**
 * Displays top-level navigation items while flagging the current route for styling.
 */
export function TopNavigation({
  items,
  className,
}: {
  items: AppNavigationItem[]
  className?: string
}) {
  const pathname = usePathname()
  logComponentRender("TopNavigation", { pathname })

  return (
    <NavigationMenu
      className={className}
      viewport={false}
      aria-label="Primary navigation"
    >
      <NavigationMenuList>
        {items.map((item) => (
          <NavigationMenuItem key={item.id}>
            <NavigationMenuLink
              asChild
              data-active={pathname === item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium transition", // base typography
                "data-[active=true]:text-primary data-[active=true]:font-semibold"
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}


