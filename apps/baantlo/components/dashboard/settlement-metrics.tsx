import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

import type { z } from "zod"
import type { DashboardStatsSchema } from "@/lib/dashboard/schema"

type SettlementStats = z.infer<
  typeof DashboardStatsSchema
>["settlement_stats"]

type PaymentMethodStat = z.infer<
  typeof DashboardStatsSchema
>["payment_methods"][number]

type SettlementMetricsProps = {
  stats: SettlementStats
  paymentMethods: PaymentMethodStat[]
}

export function SettlementMetricsCard({
  stats,
  paymentMethods,
}: SettlementMetricsProps) {
  const total = stats.completed + stats.pending
  const orderedMethods = [...paymentMethods].sort(
    (a, b) => b.count - a.count
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Settlement health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>{stats.completion_rate.toFixed(1)}% complete</span>
            <span>
              {stats.completed} / {total || 1}
            </span>
          </div>
          <Progress value={stats.completion_rate} className="mt-2" />
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="font-medium text-muted-foreground">
            Preferred payment methods
          </div>
          {orderedMethods.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              We&apos;ll highlight the most popular ways your friends settle up
              once payments start flowing.
            </p>
          ) : (
            orderedMethods.map((method) => {
              const share =
                total > 0 ? Math.round((method.count / total) * 100) : 0

              return (
                <div
                  key={method.method}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
                >
                  <span className="text-sm capitalize">
                    {method.method.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {method.count} · {share}%
                  </span>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
