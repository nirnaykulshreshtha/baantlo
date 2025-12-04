"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Building2, Layers, ShieldCheck } from "lucide-react"

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { deleteGroupAction } from "./actions"

type GroupRow = {
  id: string
  name: string
  type: string
  baseCurrency: string
  role: "owner" | "member" | string
  unreadCount: number | null
  description?: string | null
}

type GroupsGridProps = {
  items: GroupRow[]
}

const groupTypeLabels: Record<string, string> = {
  trip: "Trip",
  home: "Home",
  couple: "Couple",
  personal: "Personal",
  business: "Business",
  event: "Event",
  other: "Other",
}

const MotionCard = motion.div

export function GroupsGrid({ items }: GroupsGridProps) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "member">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const typeOptions = useMemo(() => {
    const tally = new Set<string>()
    for (const item of items) {
      tally.add(item.type)
    }
    return Array.from(tally.values()).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.description?.toLowerCase().includes(term) ?? false)
      const matchesRole =
        roleFilter === "all" || item.role.toLowerCase() === roleFilter
      const matchesType =
        typeFilter === "all" || item.type.toLowerCase() === typeFilter
      return matchesSearch && matchesRole && matchesType
    })
  }, [items, search, roleFilter, typeFilter])

  if (!items.length) {
    return (
      <EmptyState
        title="You haven't created a group yet"
        description="Organise shared expenses by creating a group for your trip, household, or project."
        icon={<span aria-hidden className="text-2xl">🧑‍🤝‍🧑</span>}
        action={
          <Button asChild>
            <Link href="/groups/new">Create your first group</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
          <span aria-hidden className="text-muted-foreground">🔍</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groups or descriptions"
            aria-label="Search groups"
            className="border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ToggleGroup
            type="single"
            value={roleFilter}
            onValueChange={(value) => value && setRoleFilter(value as typeof roleFilter)}
            aria-label="Filter by role"
            spacing={0}
          >
            <ToggleGroupItem value="all">All roles</ToggleGroupItem>
            <ToggleGroupItem value="owner">Owner</ToggleGroupItem>
            <ToggleGroupItem value="member">Member</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={typeFilter}
            onValueChange={(value) => value && setTypeFilter(value)}
            aria-label="Filter by group type"
            spacing={0}
          >
            <ToggleGroupItem value="all">All types</ToggleGroupItem>
            {typeOptions.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {groupTypeLabels[option] ?? option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          subtle
          title="No groups match the selected filters"
          description="Try broadening your search or clearing the filters."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {filteredItems.map((group, index) => {
              const typeLabel =
                groupTypeLabels[group.type] ?? group.type.replace(/_/g, " ")
              const isOwner = group.role === "owner"
              const icon =
                group.type === "business"
                  ? <Building2 className="size-4" aria-hidden="true" />
                  : group.type === "event"
                    ? <Layers className="size-4" aria-hidden="true" />
                    : <ShieldCheck className="size-4" aria-hidden="true" />

              return (
                <MotionCard
                  key={group.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 p-5 shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-secondary/60 to-primary/40" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {icon}
                        {typeLabel}
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold tracking-tight">
                          {group.name}
                        </h3>
                        {group.description ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {group.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant={isOwner ? "default" : "outline"} className="uppercase">
                      {group.role}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="rounded-full px-2 py-1 font-medium">
                      Currency · {group.baseCurrency}
                    </Badge>
                    {group.unreadCount ? (
                      <Badge variant="outline" className="rounded-full px-2 py-1">
                        {group.unreadCount} unread
                      </Badge>
                    ) : (
                      <span className="rounded-full border border-dashed px-2 py-1">
                        All caught up
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2">
                    <Button asChild variant="secondary">
                      <Link href={`/groups/${group.id}/edit`}>Manage group</Link>
                    </Button>
                    {isOwner ? (
                      <ConfirmActionDialog
                        action={deleteGroupAction}
                        fields={[{ name: "group_id", value: group.id }]}
                        title="Archive this group?"
                        description="Members will no longer be able to add new expenses, but history stays intact."
                        confirmLabel="Archive group"
                        pendingLabel="Archiving…"
                        tone="destructive"
                        trigger={
                          <Button variant="ghost" type="button" className="text-destructive hover:bg-destructive/10">
                            Archive
                          </Button>
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Only owners can archive groups
                      </span>
                    )}
                  </div>
                </MotionCard>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
