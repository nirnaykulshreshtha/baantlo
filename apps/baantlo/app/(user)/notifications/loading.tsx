/**
 * @file loading.tsx
 * @description Loading state for the notifications page.
 */

export default function NotificationsLoading() {
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-96 animate-pulse rounded-md bg-muted" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-8">
          <div className="space-y-4">
            <div className="h-6 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </section>
    </div>
  )
}

