import { z } from "zod"

const AdminDashboardMetricsSchema = z.object({
  totalUsers: z.number(),
  totalGroups: z.number(),
  activeGroups: z.number(),
  archivedGroups: z.number(),
  totalGroupMembers: z.number(),
  activeGroupMembers: z.number(),
  totalFriendInvites: z.number(),
  pendingFriendInvites: z.number(),
  totalFriendships: z.number(),
  pendingFriendships: z.number(),
  totalExpenses: z.number(),
  totalExpenseAmount: z.number(),
  totalSettlements: z.number(),
  completedSettlements: z.number(),
  pendingSettlements: z.number(),
  memberRoleCounts: z.record(z.string(), z.number()),
  memberStatusCounts: z.record(z.string(), z.number()),
})

const AdminDashboardGroupSchema = z.object({
  group_id: z.string(),
  name: z.string(),
  owner_id: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  archived: z.boolean(),
  created_at: z.string().nullable().optional(),
  member_count: z.number(),
})

const AdminDashboardFriendInviteSchema = z.object({
  id: z.string(),
  inviter_id: z.string().nullable().optional(),
  invitee_user_id: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string().nullable().optional(),
})

const AdminDashboardFriendshipSchema = z.object({
  id: z.string(),
  user_a: z.string().nullable().optional(),
  user_b: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string().nullable().optional(),
})

const AdminDashboardAdminInfoSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    display_name: z.string().nullable().optional(),
    role: z.string(),
    email_verified: z.boolean().nullable().optional(),
    phone_verified: z.boolean().nullable().optional(),
    preferred_currency: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    notifications_enabled: z.boolean().nullable().optional(),
  })
  .nullable()

const AdminDashboardSystemStatusSchema = z.object({
  adminUserExists: z.boolean(),
  databaseConnected: z.boolean(),
})

export const AdminDashboardSummarySchema = z.object({
  metrics: AdminDashboardMetricsSchema,
  groups: z.array(AdminDashboardGroupSchema),
  recentFriendInvites: z.array(AdminDashboardFriendInviteSchema),
  recentFriendships: z.array(AdminDashboardFriendshipSchema),
  adminInfo: AdminDashboardAdminInfoSchema,
  systemStatus: AdminDashboardSystemStatusSchema,
})

export type AdminDashboardSummary = z.infer<typeof AdminDashboardSummarySchema>
export type AdminDashboardMetrics = z.infer<typeof AdminDashboardMetricsSchema>
