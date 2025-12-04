export default function NewExpenseLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-6 w-64 animate-pulse rounded bg-muted" />
      <div className="h-[32rem] animate-pulse rounded-lg border bg-card" />
    </div>
  )
}
