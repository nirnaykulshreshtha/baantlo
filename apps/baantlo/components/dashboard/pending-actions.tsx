import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"

import type { z } from "zod"
import type { DashboardStatsSchema } from "@/lib/dashboard/schema"

type PendingAction = z.infer<typeof DashboardStatsSchema>["pending_actions"][number]

type PendingActionsProps = {
  currency: string
  actions: PendingAction[]
}

function formatCurrency(amount: number | undefined, currency: string) {
  if (typeof amount !== "number") return null
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

const urgencyTone: Record<
  NonNullable<PendingAction["urgency"]>,
  string
> = {
  high: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  medium: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  low: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
}

export function PendingActionsPanel({
  currency,
  actions,
}: PendingActionsProps) {
  if (!actions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Suggested follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">✅</EmptyMedia>
              <EmptyTitle>You&apos;re all set</EmptyTitle>
              <EmptyDescription>
                When something needs your attention we&apos;ll queue it here so
                you can act quickly.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Suggested follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.slice(0, 4).map((action) => {
          const urgencyClass = action.urgency
            ? urgencyTone[action.urgency] ?? ""
            : ""
          const amountLabel = formatCurrency(action.amount, currency)

          return (
            <div
              key={action.id}
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {action.title}
                    {action.urgency ? (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${urgencyClass}`}
                      >
                        {action.urgency === "high"
                          ? "High priority"
                          : action.urgency === "medium"
                            ? "Upcoming"
                            : "Nice to have"}
                      </span>
                    ) : null}
                  </div>
                  {action.description ? (
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  ) : null}
                </div>
                {amountLabel ? (
                  <Badge variant="outline">{amountLabel}</Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {action.counterparty_name ? (
                  <span>{action.counterparty_name}</span>
                ) : null}
                {action.action_text ? (
                  <>
                    <span aria-hidden>•</span>
                    <span className="font-medium text-primary">
                      {action.action_text}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
