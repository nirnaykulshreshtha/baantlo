/**
 * @file page.tsx
 * @description Notifications driven by the sync feed, keeping users informed about group activity.
 */

import { requireUser } from "@/lib/auth/session-helpers"
import { getNotifications } from "@/lib/notifications/api"

type NotificationItem = Awaited<ReturnType<typeof getNotifications>>["items"][number]

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { AnimatedSection } from "@/components/common/animated"

import { NotificationsFeed } from "./notifications-feed"

function resolveTitle(item: NotificationItem) {
  if (item.entity_type === "group" && item.op_type === "group_updated") {
    return "Group settings updated"
  }
  if (item.entity_type === "group" && item.op_type === "group_created") {
    return "New group created"
  }
  if (item.entity_type === "expense") {
    if (item.op_type === "create") return "New expense added"
    if (item.op_type === "update") return "Expense updated"
    if (item.op_type === "delete") return "Expense removed"
  }
  if (item.entity_type === "settlement") {
    if (item.op_type === "create") return "Settlement proposed"
    if (item.op_type === "complete") return "Settlement completed"
    if (item.op_type === "cancel") return "Settlement cancelled"
  }
  if (item.entity_type === "friendship") {
    if (item.op_type === "friendship_created") return "You have a new friend"
    if (item.op_type === "friend_removed") return "Friend removed"
  }
  return `${item.entity_type} ${item.op_type}`
}

function resolveDescription(item: NotificationItem) {
  const { payload } = item
  if (item.entity_type === "group" && payload && typeof payload === "object") {
    const groupName = (payload as Record<string, unknown>)["name"]
    if (typeof groupName === "string") {
      return `Group "${groupName}" was updated.`
    }
  }
  if (item.entity_type === "expense" && payload && typeof payload === "object") {
    const description = (payload as Record<string, unknown>)["description"]
    if (typeof description === "string") {
      return `Expense: ${description}`
    }
  }
  if (item.entity_type === "settlement" && payload && typeof payload === "object") {
    const from = (payload as Record<string, unknown>)["from_user_name"]
    const to = (payload as Record<string, unknown>)["to_user_name"]
    if (typeof from === "string" && typeof to === "string") {
      return `${from} → ${to}`
    }
  }
  return "Open the relevant section to view more details."
}

function payloadPreview(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2)
}

export default async function NotificationsPage() {
  await requireUser()
  const feed = await getNotifications({ limit: 50 })
  const preparedItems = feed.items
    .slice()
    .reverse()
    .map((item) => ({
      id: item.seq,
      entityType: item.entity_type,
      opType: item.op_type,
      createdAt: item.created_at,
      title: resolveTitle(item),
      description: resolveDescription(item),
      payloadPreview: payloadPreview(item.payload),
    }))

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Notifications"
          description="Stay in sync with expense updates, group changes, and settlement progress."
        />
      </AnimatedSection>

      <AnimatedSection
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="space-y-4"
      >
        <SectionTitle
          title="Latest activity"
          description="Review the 50 most recent events across your account."
        />
        <NotificationsFeed items={preparedItems} />
      </AnimatedSection>
    </PageContainer>
  )
}
