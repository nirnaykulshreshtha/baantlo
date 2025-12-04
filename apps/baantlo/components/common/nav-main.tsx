"use client"

/**
 * @file nav-main.tsx
 * @description Flexible navigation component that supports both vertical (sidebar) and horizontal (top nav) layouts.
 * Provides collapsible menu items with icons and sub-items for hierarchical navigation.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuContent,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { getNavigationIcon, type NavigationItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { logComponentRender } from "@/lib/logging"

/**
 * Props for NavMain component.
 */
export type NavMainProps = {
  /** Navigation items to render */
  items: NavigationItem[]
  /** Rendering mode: 'vertical' for sidebar, 'horizontal' for top navigation */
  variant?: "vertical" | "horizontal"
  /** Optional group label (only used in vertical mode) */
  groupLabel?: string
  /** Optional className for styling */
  className?: string
}

/**
 * Determines if a navigation sub-item is active based on the current pathname.
 * Uses exact match or proper prefix matching, ensuring more specific sub-items take precedence.
 *
 * @param subItemUrl - URL of the sub-item to check
 * @param pathname - Current pathname from Next.js router
 * @param allSubItemUrls - All sub-item URLs from the parent item (for specificity checking)
 * @returns true if the sub-item is active
 */
function isSubItemActive(
  subItemUrl: string,
  pathname: string,
  allSubItemUrls: string[]
): boolean {
  // Exact match always wins
  if (pathname === subItemUrl) {
    return true
  }
  
  // Prefix match: pathname must start with subItemUrl + "/" to be a proper child path
  if (!pathname.startsWith(subItemUrl + "/")) {
    return false
  }
  
  // Check if there's a more specific sub-item that also matches
  // If so, only the most specific one should be active
  const moreSpecificMatch = allSubItemUrls.find(
    (otherUrl) =>
      otherUrl !== subItemUrl &&
      otherUrl.length > subItemUrl.length &&
      pathname.startsWith(otherUrl)
  )
  
  // Only active if no more specific match exists
  return !moreSpecificMatch
}

/**
 * Determines if a navigation item is active based on the current pathname.
 * For items with sub-items, checks if any sub-item is active.
 * For items without sub-items, checks exact match or prefix match.
 *
 * @param item - Navigation item to check
 * @param pathname - Current pathname from Next.js router
 * @returns true if the item or any of its sub-items is active
 */
function isItemActive(item: NavigationItem, pathname: string): boolean {
  // If item has sub-items, check if any sub-item is active
  if (item.items && item.items.length > 0) {
    const subItemUrls = item.items.map((subItem) => subItem.url)
    return item.items.some((subItem) =>
      isSubItemActive(subItem.url, pathname, subItemUrls)
    )
  }

  // For items without sub-items, check exact match or prefix match
  // Exact match for root items like /dashboard
  if (item.url === "/dashboard" || item.url === "/settings") {
    return pathname === item.url || pathname.startsWith(item.url + "/")
  }

  // For other items, use prefix matching
  return pathname.startsWith(item.url)
}

/**
 * Renders navigation items in either vertical (sidebar) or horizontal (top nav) layout.
 * Supports collapsible sub-items and active state highlighting.
 * Uses pathname-based active state detection for dynamic highlighting.
 *
 * @param props.items - Array of navigation items with optional sub-items
 * @param props.variant - Layout variant: 'vertical' (default) or 'horizontal'
 * @param props.groupLabel - Label for the navigation group (vertical mode only)
 * @param props.className - Optional CSS classes
 */
export function NavMain({
  items,
  variant = "vertical",
  groupLabel = "Platform",
  className,
}: NavMainProps) {
  const pathname = usePathname()
  logComponentRender("NavMain", { variant, itemCount: items.length, pathname })

  // Vertical variant: renders in sidebar format
  if (variant === "vertical") {
    return (
      <SidebarGroup className={className}>
        <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => {
            const IconComponent = getNavigationIcon(item.icon)
            const isActive = isItemActive(item, pathname)
            return (
              <Collapsible key={item.title} asChild defaultOpen={isActive}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                    <Link href={item.url}>
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const subItemUrls = item.items?.map((si) => si.url) || []
                          const isSubItemActiveState = isSubItemActive(
                            subItem.url,
                            pathname,
                            subItemUrls
                          )
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={isSubItemActiveState}>
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  // Horizontal variant: renders in top navigation format
  return (
    <NavigationMenu className={className} viewport={false}>
      <NavigationMenuList>
        {items.map((item) => {
          const IconComponent = getNavigationIcon(item.icon)
          const isActive = isItemActive(item, pathname)
          return (
            <NavigationMenuItem key={item.title}>
              {(() => {
                const subItems = item.items
                if (!subItems?.length) return null
                return (
                  <>
                    <NavigationMenuTrigger
                      className={cn(
                        "text-sm font-medium",
                        isActive && "text-primary font-semibold"
                      )}
                    >
                      {IconComponent && (
                        <IconComponent className="mr-2 h-4 w-4" />
                      )}
                      {item.title}
                    </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {subItems.map((subItem) => {
                        const subItemUrls = subItems.map((si) => si.url)
                      const isSubItemActiveState = isSubItemActive(
                        subItem.url,
                        pathname,
                        subItemUrls
                      )
                      return (
                        <li key={subItem.title}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={subItem.url}
                              className={cn(
                                "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors",
                                "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                isSubItemActiveState && "bg-accent text-accent-foreground"
                              )}
                            >
                              <div className="text-sm font-medium leading-none">
                                {subItem.title}
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      )
                    })}
                  </ul>
                </NavigationMenuContent>
              </>
                )
              })()}
              {!item.items?.length && (
                <NavigationMenuLink
                  asChild
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition flex flex-row items-center",
                    isActive && "text-primary font-semibold"
                  )}
                >
                  <Link href={item.url}>
                    {IconComponent && (
                      <IconComponent className="mr-1 h-4 w-4" />
                    )}
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
