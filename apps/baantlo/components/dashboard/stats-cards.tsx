import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type StatsCardsProps = {
  currency: string
  userBalance: number
  totalGroups: number
  totalAmount: number
  totalExpenses: number
  amountPaidByUser: number
  pendingSettlements: number
  settlementCompletionRate: number
  monthlyChangePercent: number
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value)
}

export function DashboardStatsCards({
  currency,
  userBalance,
  totalGroups,
  totalAmount,
  totalExpenses,
  amountPaidByUser,
  pendingSettlements,
  settlementCompletionRate,
  monthlyChangePercent,
}: StatsCardsProps) {
  const monthlyChangeLabel =
    monthlyChangePercent > 0 ? "↑" : monthlyChangePercent < 0 ? "↓" : "•"

  const contributionPercent =
    totalAmount > 0 ? (amountPaidByUser / totalAmount) * 100 : 0

  const monthlyChangeTone =
    monthlyChangePercent > 5
      ? "text-emerald-600 dark:text-emerald-400"
      : monthlyChangePercent < -5
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net balance across groups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-semibold">
            {formatCurrency(userBalance, currency)}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={userBalance >= 0 ? "outline" : "destructive"}>
              {userBalance >= 0 ? "They owe you" : "You owe"}
            </Badge>
            <Separator orientation="vertical" className="h-4" />
            <span>{formatNumber(totalGroups)} active groups</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total shared spending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-semibold">
            {formatCurrency(totalAmount, currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            Across {formatNumber(totalExpenses)} expenses
          </div>
          <div className={`text-xs font-medium ${monthlyChangeTone}`}>
            {monthlyChangeLabel} {Math.abs(monthlyChangePercent).toFixed(1)}% vs
            last month
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Your contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-semibold">
            {formatCurrency(amountPaidByUser, currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(contributionPercent)}% of group spending
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Settlements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-semibold">
              {formatNumber(pendingSettlements)}
            </div>
            <span className="text-xs text-muted-foreground">
              pending to review
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Completion rate:{" "}
            <span className="font-medium text-foreground">
              {settlementCompletionRate.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
