/**
 * @file loading.tsx
 * @description Skeleton UI for settings sub-routes while route data streams.
 */

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading fallback for `/settings` route group.
 */
export default function SettingsLoading() {
  return (
    <div
      className="grid min-h-[60vh] gap-6 lg:grid-cols-[280px_1fr]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <aside className="space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <main
        id="main-content"
        className="space-y-6 focus:outline-none"
        tabIndex={-1}
      >
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      </main>
    </div>
  )
}


