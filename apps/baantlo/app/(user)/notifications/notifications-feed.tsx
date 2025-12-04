"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Clock, Database, Filter } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type NotificationEntry = {
  id: number
  entityType: string
  opType: string
  createdAt: string
  title: string
  description: string
  payloadPreview: string
}

type NotificationsFeedProps = {
  items: NotificationEntry[]
}

const MotionCard = motion.div

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  const timeFormatter = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return `${dateFormatter.format(date)} • ${timeFormatter.format(date)}`
}

export function NotificationsFeed({ items }: NotificationsFeedProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<string>("all")
  const [showPayload, setShowPayload] = useState<Record<number, boolean>>({})

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesFilter =
        filter === "all" || item.entityType.toLowerCase() === filter
      if (!term) return matchesFilter
      const searchable = `${item.title} ${item.description} ${item.entityType} ${item.opType}`.toLowerCase()
      return matchesFilter && searchable.includes(term)
    })
  }, [filter, items, search])

  if (!items.length) {
    return (
      <EmptyState
        title="No notifications yet"
        description="We will surface group, expense, and settlement activity as soon as something happens."
        icon={<span aria-hidden className="text-xl">🔔</span>}
      />
    )
  }

  const entityTypes = Array.from(
    new Set(items.map((item) => item.entityType.toLowerCase())),
  ).sort()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
          <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notifications"
            aria-label="Search notifications"
            className="border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => value && setFilter(value)}
          aria-label="Filter by entity type"
          spacing={0}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          {entityTypes.map((type) => (
            <ToggleGroupItem key={type} value={type}>
              {type}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <AnimatePresence>
        {filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
          >
            <EmptyState
              subtle
              title="No notifications match your filters"
              description="Try clearing the search filters."
            />
          </motion.div>
        ) : (
          filteredItems.map((item, index) => {
            const payloadOpen = showPayload[item.id] ?? false
            return (
              <MotionCard
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className="space-y-4 rounded-3xl border bg-background/80 p-5 shadow-sm backdrop-blur"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Badge variant="outline" className="uppercase">
                        {item.entityType}
                      </Badge>
                      <Badge variant="secondary">{item.opType}</Badge>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 text-xs text-muted-foreground md:items-end">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Clock className="size-3.5" aria-hidden="true" />
                      Seq #{item.id}
                    </span>
                    <span>{formatTimestamp(item.createdAt)}</span>
                    <Collapsible
                      open={payloadOpen}
                      onOpenChange={(open) =>
                        setShowPayload((prev) => ({ ...prev, [item.id]: open }))
                      }
                      className="w-full md:w-auto"
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="gap-2 text-xs"
                        >
                          <Database className="size-3.5" aria-hidden="true" />
                          {payloadOpen ? "Hide payload" : "View payload"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
                          {item.payloadPreview}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </MotionCard>
            )
          })
        )}
      </AnimatePresence>
    </div>
  )
}

