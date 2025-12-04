/**
 * @file loading.tsx
 * @description Fallback UI displayed while user-scoped routes resolve layout preferences and data dependencies.
 * Presents a responsive skeleton that hints at both sidebar and header structures.
 */

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading indicator for the `(user)` route group.
 */
export default function UserRouteLoading() {
  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <header className="flex h-16 items-center border-b px-6">
        <Skeleton className="h-8 w-32" />
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 flex-shrink-0 border-r bg-muted/30 p-6 lg:block">
          <div className="space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </aside>
        <main
          id="main-content"
          className="flex flex-1 flex-col gap-6 px-6 py-10 focus:outline-none"
          tabIndex={-1}
        >
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}


