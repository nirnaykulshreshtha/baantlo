import { z } from "zod"

const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["expense", "settlement"]),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  created_at: z.string(),
  group_name: z.string(),
  group_id: z.string(),
  user_involved: z.boolean().optional().default(false),
})

const BalanceBreakdownItemSchema = z.object({
  user_id: z.string(),
  user_name: z.string(),
  amount_inr: z.number(),
  currency: z.string(),
  groups_count: z.number().optional(),
})

const SpendingTrendEntrySchema = z.object({
  date: z.string(),
  total_amount: z.number(),
  user_amount: z.number(),
})

const GroupSpendingEntrySchema = z.object({
  group_name: z.string(),
  group_id: z.string(),
  amount: z.number(),
  expense_count: z.number(),
})

const TopExpenseEntrySchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  payer_name: z.string(),
  group_name: z.string(),
  group_id: z.string(),
  expense_date: z.string(),
  is_paid_by_user: z.boolean(),
})

const SettlementStatsSchema = z.object({
  completed: z.number(),
  pending: z.number(),
  completion_rate: z.number(),
})

const PaymentMethodStatsSchema = z.object({
  method: z.string(),
  count: z.number(),
})

const MonthlyComparisonSchema = z.object({
  current_month: z.number(),
  previous_month: z.number(),
  change_percent: z.number(),
})

const PendingActionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  action_text: z.string().optional(),
  amount: z.number().optional(),
  counterparty_name: z.string().optional(),
})

const GroupOverviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  member_count: z.number(),
  last_activity: z.string().nullable().optional(),
  last_activity_type: z.string().nullable().optional(),
  pending_expenses: z.number(),
  pending_settlements: z.number(),
  is_settled: z.boolean(),
})

const UpcomingSettlementSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  due_date: z.string(),
  direction: z.enum(["owes_you", "you_owe"]),
  counterparty_name: z.string(),
  group_name: z.string(),
})

export const DashboardStatsSchema = z.object({
  total_groups: z.number(),
  total_expenses: z.number(),
  total_settlements: z.number(),
  pending_settlements: z.number(),
  user_balance: z.number(),
  currency: z.string(),
  recent_activity: z.array(ActivityItemSchema),
  total_amount: z.number(),
  avg_amount: z.number(),
  expenses_paid_by_user: z.number(),
  amount_paid_by_user: z.number(),
  balance_breakdown: z.array(BalanceBreakdownItemSchema),
  spending_trend: z.array(SpendingTrendEntrySchema),
  group_spending: z.array(GroupSpendingEntrySchema),
  top_expenses: z.array(TopExpenseEntrySchema),
  settlement_stats: SettlementStatsSchema,
  payment_methods: z.array(PaymentMethodStatsSchema),
  monthly_comparison: MonthlyComparisonSchema,
  pending_actions: z.array(PendingActionSchema),
  groups_overview: z.array(GroupOverviewSchema),
  upcoming_settlements: z.array(UpcomingSettlementSchema),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>
export type DashboardActivityItem = z.infer<typeof ActivityItemSchema>
export type DashboardBalanceItem = z.infer<typeof BalanceBreakdownItemSchema>
