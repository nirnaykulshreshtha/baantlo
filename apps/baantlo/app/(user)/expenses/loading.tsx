export default function ExpensesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-56 animate-pulse rounded bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="h-80 animate-pulse rounded-lg border bg-card" />
    </div>
  )
}
