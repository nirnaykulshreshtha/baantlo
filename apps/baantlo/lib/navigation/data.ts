/**
 * @file data.ts
 * @description Centralized navigation data structure for both vertical and horizontal layouts.
 * This serves as the single source of truth for all navigation items, user data, and menu configurations.
 * Uses icon keys (strings) instead of icon components to allow passing data from Server Components to Client Components.
 */

import type { Session } from "next-auth"

import {
  type AnyPermission,
  userHasAllPermissions,
  userHasAllRoles,
  userHasAnyPermission,
  userHasAnyRole,
} from "@/lib/auth/constants"

export type NavigationAccessRequirement = {
  /** User must have at least one of these permissions */
  requiresAnyPermissions?: readonly AnyPermission[]
  /** User must have all of these permissions */
  requiresAllPermissions?: readonly AnyPermission[]
  /** User must have at least one of these roles */
  requiresAnyRoles?: readonly string[]
  /** User must have all of these roles */
  requiresAllRoles?: readonly string[]
}

/**
 * Available icon keys for navigation items.
 * These keys are used to resolve icon components in client components.
 */
export type NavigationIconKey =
  | "square-terminal"
  | "bot"
  | "book-open"
  | "settings-2"
  | "life-buoy"
  | "send"
  | "frame"
  | "pie-chart"
  | "map"
  | "bell"
  | "users"
  | "layers"
  | "wallet"
  | "receipt"

/**
 * Represents a navigation item with optional sub-items for hierarchical menus.
 */
export type NavigationSubItem = {
  title: string
  url: string
} & NavigationAccessRequirement

export type NavigationItem = {
  /** Display title of the navigation item */
  title: string
  /** URL or href for navigation */
  url: string
  /** Icon key used to resolve the icon component in client components */
  icon: NavigationIconKey
  /** Whether this item is currently active */
  isActive?: boolean
  /** Optional sub-items for collapsible menus */
  items?: NavigationSubItem[]
} & NavigationAccessRequirement

/**
 * Represents a secondary navigation item (typically shown in footer or secondary area).
 */
export type SecondaryNavigationItem = {
  title: string
  url: string
  icon: NavigationIconKey
}

/**
 * Represents a project item in the navigation.
 */
export type ProjectItem = {
  name: string
  url: string
  icon: NavigationIconKey
}

/**
 * Represents user information for navigation components.
 */
export type UserData = {
  name: string
  email: string
  avatar: string
}

/**
 * Complete navigation data structure used by both vertical and horizontal layouts.
 */
export type NavigationData = {
  user: UserData
  navMain: NavigationItem[]
  navSecondary: SecondaryNavigationItem[]
  projects: ProjectItem[]
}

/**
 * Default navigation data for the application.
 * This is the single source of truth for all navigation items.
 * Uses icon keys instead of icon components to allow serialization from Server to Client Components.
 */
const dashboardNavMenuItem: NavigationItem = {
  title: "Dashboard",
  url: "/dashboard",
  icon: "pie-chart",
}

const notificationsNavMenuItem: NavigationItem = {
  title: "Notifications",
  url: "/notifications",
  icon: "bell",
}

const friendsNavMenuItem: NavigationItem = {
  title: "Friends",
  url: "/friends",
  icon: "users",
}

const groupsNavMenuItem: NavigationItem = {
  title: "Groups",
  url: "/groups",
  icon: "layers",
  items: [
    { title: "All groups", url: "/groups" },
    { title: "Create group", url: "/groups/new" },
  ],
}

const expensesNavMenuItem: NavigationItem = {
  title: "Expenses",
  url: "/expenses",
  icon: "receipt",
  items: [
    { title: "All expenses", url: "/expenses" },
    { title: "Add expense", url: "/expenses/new" },
  ],
}

const settlementsNavMenuItem: NavigationItem = {
  title: "Settlements",
  url: "/settlements",
  icon: "wallet",
  items: [
    { title: "All settlements", url: "/settlements" },
    { title: "Record settlement", url: "/settlements/new" },
  ],
}

const adminNavMenuItem: NavigationItem = {
  title: "Admin",
  url: "/admin/dashboard",
  icon: "frame",
  requiresAnyPermissions: ["admin.full_access"],
}

export const defaultNavigationData: NavigationData = {
  user: {
    name: "",
    email: "",
    avatar: "",
  },
  navMain: [
    dashboardNavMenuItem,
    notificationsNavMenuItem,
    friendsNavMenuItem,
    groupsNavMenuItem,
    expensesNavMenuItem,
    settlementsNavMenuItem,
    adminNavMenuItem,
  ],
  navSecondary: [],
  projects: [],
}

type SessionUserAuthShape = {
  role?: string | null
  roles?: string[] | null
  permissions?: string[] | null
}

function satisfiesRequirement(
  user: SessionUserAuthShape | null | undefined,
  requirement: NavigationAccessRequirement | undefined
): boolean {
  if (!requirement) {
    return true
  }

  if (
    requirement.requiresAnyPermissions &&
    requirement.requiresAnyPermissions.length > 0 &&
    !userHasAnyPermission(user, requirement.requiresAnyPermissions)
  ) {
    return false
  }

  if (
    requirement.requiresAllPermissions &&
    requirement.requiresAllPermissions.length > 0 &&
    !userHasAllPermissions(user, requirement.requiresAllPermissions)
  ) {
    return false
  }

  if (
    requirement.requiresAnyRoles &&
    requirement.requiresAnyRoles.length > 0 &&
    !userHasAnyRole(user, requirement.requiresAnyRoles)
  ) {
    return false
  }

  if (
    requirement.requiresAllRoles &&
    requirement.requiresAllRoles.length > 0 &&
    !userHasAllRoles(user, requirement.requiresAllRoles)
  ) {
    return false
  }

  return true
}

function filterNavigationItems(
  items: NavigationItem[],
  user: SessionUserAuthShape | null | undefined
): NavigationItem[] {
  return items.reduce<NavigationItem[]>((acc, item) => {
    if (!satisfiesRequirement(user, item)) {
      return acc
    }

    const subItems = item.items
      ?.filter((subItem) => satisfiesRequirement(user, subItem))
      .map((subItem) => ({ ...subItem }))

    acc.push({
      ...item,
      items: subItems && subItems.length > 0 ? subItems : undefined,
    })
    return acc
  }, [])
}

/**
 * Creates navigation data populated with real user information from the active session.
 *
 * @param session - The authenticated NextAuth session, if available.
 * @returns Navigation data with user fields hydrated from the session.
 */
export function createNavigationDataFromSession(
  session: Session | null | undefined
): NavigationData {
  const base = defaultNavigationData
  const sessionUser = session?.user as SessionUserAuthShape | undefined
  const navMain: NavigationItem[] = filterNavigationItems(base.navMain, sessionUser)

  if (!sessionUser) {
    return {
      user: { ...base.user },
      navMain,
      navSecondary: [...base.navSecondary],
      projects: [...base.projects],
    }
  }

  const user = sessionUser as Record<string, unknown>

  const email =
    typeof user["email"] === "string" && user["email"].trim().length > 0
      ? (user["email"] as string).trim()
      : base.user.email

  const displayNameCandidates = [
    user["display_name"],
    user["name"],
    email,
  ]
  const rawDisplayName = displayNameCandidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  )
  const displayName =
    typeof rawDisplayName === "string"
      ? rawDisplayName.trim()
      : email || base.user.name || "Your account"

  const avatarCandidates = [
    user["avatar"],
    user["image"],
    user["avatar_key"],
  ]
  const rawAvatar = avatarCandidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  )
  const avatar =
    typeof rawAvatar === "string" ? rawAvatar.trim() : base.user.avatar

  return {
    user: {
      name: displayName,
      email,
      avatar,
    },
    navMain,
    navSecondary: [...base.navSecondary],
    projects: [...base.projects],
  }
}
