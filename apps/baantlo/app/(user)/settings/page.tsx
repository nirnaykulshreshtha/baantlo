/**
 * @file page.tsx
 * @description Default settings route that redirects to the appearance settings page.
 */

import { redirect } from "next/navigation"

/**
 * Redirects from `/settings` to `/settings/appearance`.
 */
export default function SettingsPage() {
  redirect("/settings/appearance")
}


