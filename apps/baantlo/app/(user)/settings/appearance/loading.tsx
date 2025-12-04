/**
 * @file loading.tsx
 * @description Loading skeleton for the appearance settings page while theme and layout preferences resolve.
 */

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Fallback while appearance settings payload is streaming.
 */
export default function AppearanceSettingsLoading() {
  return (
    <section
      id="main-content"
      className="space-y-6 focus:outline-none"
      role="status"
      aria-live="polite"
      aria-busy="true"
      tabIndex={-1}
    >
      <header className="space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="space-y-4 rounded-lg border p-6"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, cardIdx) => (
                <Skeleton key={cardIdx} className="h-28 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}


