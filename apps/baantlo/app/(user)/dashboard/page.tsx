import Link from "next/link"
import { Plus, Users, Wallet } from "lucide-react"

import { requireAnyPermission } from "@/lib/auth/session-helpers"
import { getDashboardStats } from "@/lib/dashboard/api"

import { BalanceBreakdownTable } from "@/components/dashboard/balance-breakdown"
import { DashboardStatsCards } from "@/components/dashboard/stats-cards"
import { PendingActionsPanel } from "@/components/dashboard/pending-actions"
import { UpcomingSettlementsList } from "@/components/dashboard/upcoming-settlements"
import { DashboardActivityFeed } from "@/components/dashboard/activity-feed"
import { SpendingTrendChart } from "@/components/dashboard/spending-trend-chart"
import { GroupSpendingChart } from "@/components/dashboard/group-spending-chart"
import { GroupsOverviewGrid } from "@/components/dashboard/groups-overview"
import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { Button } from "@/components/ui/button"
import { AnimatedSection } from "@/components/common/animated"

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

export default async function DashboardPage() {
  const session = await requireAnyPermission([
    "user.read.self",
    "user.read.any",
  ])
  const stats = await getDashboardStats()

  const user = session.user
  const userName =
    user.display_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there"

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: stats.currency,
      maximumFractionDigits: 0,
    }).format(amount)

  const hasGroups = stats.total_groups > 0
  const hasBalances = stats.balance_breakdown.length > 0
  const hasOwedBalances = stats.balance_breakdown.some(
    (item) => item.amount_inr < 0,
  )

  const headerStats = [
    {
      label: "Net position",
      value: formatCurrency(Math.abs(stats.user_balance)),
      hint: stats.user_balance >= 0 ? "They owe you money" : "You owe others",
      trend: stats.user_balance >= 0 ? "up" : "down" as const,
    },
    {
      label: "Active groups",
      value: stats.total_groups.toString(),
      hint: `${new Intl.NumberFormat("en-IN").format(stats.total_expenses)} expenses logged`,
    },
    {
      label: "Pending settlements",
      value: stats.pending_settlements.toString(),
      hint: `${stats.settlement_stats.completion_rate.toFixed(0)}% completion rate`,
    },
  ]

  return (
    <PageContainer className="pb-8">
      <AnimatedSection {...fadeIn(0)}>
        <PageHeader
          eyebrow="Your shared finances, at a glance"
          title={`Welcome back, ${userName} 👋`}
          description={
            hasBalances
              ? "Stay on top of who owes what, keep an eye on settlements, and jump straight into the actions that matter."
              : "Create a group or log an expense to see balances, insights, and reminders light up here."
          }
          actions={
            <>
              <Button asChild size="lg" className="gap-2">
                <Link href={hasGroups ? "/expenses/new" : "/groups/new"}>
                  {hasGroups ? <Plus className="size-4" aria-hidden="true" /> : <Users className="size-4" aria-hidden="true" />}
                  {hasGroups ? "Add expense" : "Create group"}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/settlements/new">
                  <Wallet className="size-4" aria-hidden="true" />
                  Record settlement
                </Link>
              </Button>
            </>
          }
          stats={headerStats}
        />
      </AnimatedSection>

      <AnimatedSection {...fadeIn(0.1)}>
        <DashboardStatsCards
          currency={stats.currency}
          userBalance={stats.user_balance}
          totalGroups={stats.total_groups}
          totalAmount={stats.total_amount}
          totalExpenses={stats.total_expenses}
          amountPaidByUser={stats.amount_paid_by_user}
          pendingSettlements={stats.pending_settlements}
          settlementCompletionRate={stats.settlement_stats.completion_rate}
          monthlyChangePercent={stats.monthly_comparison.change_percent}
        />
      </AnimatedSection>

      <AnimatedSection {...fadeIn(0.15)} className="space-y-4">
        <SectionTitle
          title="Balance breakdown"
          description="See who owes whom across all groups. Keep the list short by recording settlements regularly."
          actions={
            hasOwedBalances ? (
              <Button asChild variant="ghost" className="gap-2">
                <Link href="/settlements/new">
                  <Wallet className="size-4" aria-hidden="true" />
                  Settle up now
                </Link>
              </Button>
            ) : null
          }
        />
        <BalanceBreakdownTable
          currency={stats.currency}
          items={stats.balance_breakdown}
        />
      </AnimatedSection>

      <AnimatedSection
        {...fadeIn(0.2)}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]"
      >
        <SpendingTrendChart
          currency={stats.currency}
          data={stats.spending_trend}
        />
        <PendingActionsPanel
          currency={stats.currency}
          actions={stats.pending_actions}
        />
      </AnimatedSection>

      <AnimatedSection
        {...fadeIn(0.25)}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]"
      >
        <GroupSpendingChart
          currency={stats.currency}
          data={stats.group_spending}
        />
        <UpcomingSettlementsList
          currency={stats.currency}
          items={stats.upcoming_settlements}
        />
      </AnimatedSection>

      <AnimatedSection
        {...fadeIn(0.3)}
        className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
      >
        <DashboardActivityFeed
          currency={stats.currency}
          items={stats.recent_activity}
        />
        <GroupsOverviewGrid groups={stats.groups_overview} />
      </AnimatedSection>
    </PageContainer>
  )
}
