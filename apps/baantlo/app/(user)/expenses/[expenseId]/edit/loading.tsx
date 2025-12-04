export default function EditExpenseLoading() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-6 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="h-[24rem] animate-pulse rounded-lg border bg-card" />
        <div className="h-[24rem] animate-pulse rounded-lg border bg-card" />
      </div>
    </div>
  )
}
