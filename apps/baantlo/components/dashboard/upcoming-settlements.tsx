import { format, parseISO } from "date-fns"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"

import type { z } from "zod"
import type { DashboardStatsSchema } from "@/lib/dashboard/schema"

type UpcomingSettlement = z.infer<
  typeof DashboardStatsSchema
>["upcoming_settlements"][number]

type UpcomingSettlementsProps = {
  currency: string
  items: UpcomingSettlement[]
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function UpcomingSettlementsList({
  currency,
  items,
}: UpcomingSettlementsProps) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Upcoming settlements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">📅</EmptyMedia>
              <EmptyTitle>No reminders scheduled</EmptyTitle>
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
          Upcoming settlements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const dueDate = parseISO(item.due_date)
          const isYouOwe = item.direction === "you_owe"

          return (
            <div
              key={item.id}
              className="rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">
                    {item.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.group_name}
                  </div>
                </div>
                <Badge variant={isYouOwe ? "destructive" : "outline"}>
                  {formatCurrency(item.amount, currency)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{item.counterparty_name}</span>
                <span aria-hidden>•</span>
                <span suppressHydrationWarning>
                  Due {format(dueDate, "EEE, MMM d")}
                </span>
                <span aria-hidden>•</span>
                <span>
                  {isYouOwe ? "You owe" : "Owes you"}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
