import { format, formatDistanceToNow } from "date-fns"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"

import type { DashboardActivityItem } from "@/lib/dashboard/schema"

type ActivityFeedProps = {
  currency: string
  items: DashboardActivityItem[]
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DashboardActivityFeed({ currency, items }: ActivityFeedProps) {
  if (!items.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">🧾</EmptyMedia>
              <EmptyTitle>No activity yet</EmptyTitle>
              <EmptyDescription>
                Your most recent expenses, settlements, and reminders will show
                up here once you start collaborating with a group.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              Keep track of your groups by logging a new expense or inviting
              friends to collaborate.
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const createdAt = new Date(item.created_at)
          const relative = formatDistanceToNow(createdAt, { addSuffix: true })
          const amountLabel =
            item.amount > 0
              ? formatCurrency(item.amount, currency)
              : formatCurrency(Math.abs(item.amount), currency)

          return (
            <div
              key={`${item.type}-${item.id}`}
              className="flex flex-col gap-1 rounded-lg border p-3 transition hover:bg-muted/60"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Badge variant={item.type === "expense" ? "outline" : "default"}>
                    {item.type === "expense" ? "Expense" : "Settlement"}
                  </Badge>
                  <span className="text-foreground">{item.description}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {amountLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Group · {item.group_name}</span>
                <span>Logged {relative}</span>
                <span suppressHydrationWarning>
                  {format(createdAt, "MMM d, yyyy • h:mm a")}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
