import { formatDistanceToNow } from "date-fns"

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

import type { z } from "zod"
import type { DashboardStatsSchema } from "@/lib/dashboard/schema"

type GroupOverview = z.infer<
  typeof DashboardStatsSchema
>["groups_overview"][number]

type GroupsOverviewProps = {
  groups: GroupOverview[]
}

export function GroupsOverviewGrid({ groups }: GroupsOverviewProps) {
  if (!groups.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Your groups at a glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">🧑‍🤝‍🧑</EmptyMedia>
              <EmptyTitle>No groups yet</EmptyTitle>
              <EmptyDescription>
                Create a group to start tracking shared expenses for trips,
                homes, friends, or anything else you split.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              Once you have active groups, we&apos;ll surface the ones that need
              your attention here.
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Your groups at a glance
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {groups.slice(0, 4).map((group) => {
          const lastActivityDate = group.last_activity
            ? formatDistanceToNow(new Date(group.last_activity), {
                addSuffix: true,
              })
            : "No activity yet"

          return (
            <div
              key={group.id}
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.member_count} member
                    {group.member_count === 1 ? "" : "s"}
                  </div>
                </div>
                <Badge variant={group.is_settled ? "outline" : "default"}>
                  {group.is_settled ? "Settled" : "Active"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span suppressHydrationWarning>
                  Last activity {lastActivityDate}
                </span>
                <span aria-hidden>•</span>
                <span>
                  {group.pending_expenses} new expense
                  {group.pending_expenses === 1 ? "" : "s"}
                </span>
                <span aria-hidden>•</span>
                <span>
                  {group.pending_settlements} pending settlement
                  {group.pending_settlements === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
