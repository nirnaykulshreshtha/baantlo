"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { CheckCircle2, HandCoins, Undo2 } from "lucide-react"

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog"
import { EmptyState } from "@/components/common/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import {
  cancelSettlementAction,
  completeSettlementAction,
} from "./actions"

type SettlementRow = {
  id: string
  groupId: string
  groupName: string
  from: string
  to: string
  amount: number
  currency: string
  method: string
  status: string
  createdAt: string
  settledAt?: string | null
}

type SettlementsTableProps = {
  items: SettlementRow[]
}

const MotionTableRow = motion(TableRow)

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function SettlementsTable({ items }: SettlementsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  if (!items.length) {
    return (
      <EmptyState
        title="No settlements yet"
        description="As soon as someone records a settlement, it will appear here."
        icon={<span aria-hidden className="text-2xl">🤝</span>}
        action={
          <Button asChild>
            <Link href="/settlements/new">Record a settlement</Link>
          </Button>
        }
      />
    )
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter
      if (!matchesStatus) return false
      if (!term) return true
      const haystack = `${item.groupName} ${item.from} ${item.to} ${item.method}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [items, search, statusFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
          <span aria-hidden className="text-muted-foreground">🔍</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by group or members"
            aria-label="Search settlements"
            className="border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value)}
          aria-label="Filter settlements by status"
          spacing={0}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
          <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
          <ToggleGroupItem value="cancelled">Cancelled</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background/80 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Group</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {filteredItems.map((settlement) => {
                const isPending = settlement.status === "pending"
                return (
                  <MotionTableRow
                    key={settlement.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {settlement.groupName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          #{settlement.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {settlement.from}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {settlement.to}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium">
                        {formatCurrency(settlement.amount, settlement.currency)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {settlement.method.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          settlement.status === "completed"
                            ? "default"
                            : settlement.status === "pending"
                              ? "outline"
                              : "destructive"
                        }
                        className="uppercase"
                      >
                        {settlement.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isPending
                        ? formatDate(settlement.createdAt)
                        : formatDate(settlement.settledAt)}
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-2">
                      {isPending ? (
                        <>
                          <ConfirmActionDialog
                            action={completeSettlementAction}
                            fields={[{ name: "settlement_id", value: settlement.id }]}
                            title="Mark settlement as complete?"
                            description="This records that both parties have settled the balance."
                            confirmLabel="Mark complete"
                            pendingLabel="Completing…"
                            trigger={
                              <Button
                                type="button"
                                size="sm"
                                className="gap-2"
                              >
                                <CheckCircle2 className="size-4" aria-hidden="true" />
                                Complete
                              </Button>
                            }
                          />
                          <ConfirmActionDialog
                            action={cancelSettlementAction}
                            fields={[{ name: "settlement_id", value: settlement.id }]}
                            title="Cancel this settlement?"
                            description="We’ll keep the history but mark it as cancelled so members know it needs to be recreated."
                            confirmLabel="Cancel settlement"
                            pendingLabel="Cancelling…"
                            tone="destructive"
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-2 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Undo2 className="size-4" aria-hidden="true" />
                                Cancel
                              </Button>
                            }
                          />
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <HandCoins className="size-4 text-emerald-500" aria-hidden="true" />
                          {settlement.status === "completed"
                            ? `Completed ${formatDate(settlement.settledAt)}`
                            : `Cancelled ${formatDate(settlement.settledAt)}`}
                        </span>
                      )}
                    </TableCell>
                  </MotionTableRow>
                )
              })}
            </AnimatePresence>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    subtle
                    title="No settlements match the filters"
                    description="Adjust the search or status filter to view more results."
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

