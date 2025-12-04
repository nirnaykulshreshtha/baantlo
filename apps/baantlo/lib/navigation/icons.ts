/**
 * @file icons.ts
 * @description Icon resolver for navigation items. Maps icon keys to Lucide icon components for use in client components.
 */

import {
  BookOpen,
  Bot,
  Bell,
  Frame,
  Layers,
  LifeBuoy,
  Map,
  PieChart,
  Receipt,
  Send,
  Settings2,
  SquareTerminal,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { type NavigationIconKey } from "./data"

/**
 * Mapping of icon keys to Lucide icon components.
 * This allows serialization of navigation data from Server to Client Components.
 */
export const navigationIcons: Record<NavigationIconKey, LucideIcon> = {
  "square-terminal": SquareTerminal,
  bot: Bot,
  "book-open": BookOpen,
  "settings-2": Settings2,
  "life-buoy": LifeBuoy,
  send: Send,
  frame: Frame,
  "pie-chart": PieChart,
  map: Map,
  bell: Bell,
  users: Users,
  layers: Layers,
  wallet: Wallet,
  receipt: Receipt,
}

/**
 * Resolves an icon component from an icon key.
 *
 * @param iconKey - The icon key to resolve
 * @returns The corresponding Lucide icon component, or undefined if not found
 */
export function getNavigationIcon(iconKey: NavigationIconKey): LucideIcon | undefined {
  return navigationIcons[iconKey]
}

