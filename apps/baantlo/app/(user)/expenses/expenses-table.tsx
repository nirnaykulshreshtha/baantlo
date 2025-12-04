"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Filter, Pencil, Search, Trash2 } from "lucide-react"

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/common/empty-state"

import { deleteExpenseAction } from "./actions"

type ExpenseRow = {
  id: string
  description: string
  groupId: string
  groupName: string
  payerName: string
  currency: string
  amount: number
  expenseDate: string
  formattedDate: string
}

type ExpensesTableProps = {
  items: ExpenseRow[]
}

const MotionTableRow = motion(TableRow)

const rowAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
}

export function ExpensesTable({ items }: ExpensesTableProps) {
  const [search, setSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"recent" | "amount-desc" | "amount-asc">("recent")

  const groupOptions = useMemo(() => {
    const unique = new Map<string, string>()
    for (const item of items) {
      unique.set(item.groupId, item.groupName)
    }
    return Array.from(unique.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items
      .filter((item) => {
        const matchesGroup = selectedGroup === "all" || item.groupId === selectedGroup
        if (!matchesGroup) return false
        if (!term) return true
        return (
          item.description.toLowerCase().includes(term) ||
          item.payerName.toLowerCase().includes(term) ||
          item.groupName.toLowerCase().includes(term)
        )
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
        }
        if (sortBy === "amount-desc") {
          return b.amount - a.amount
        }
        return a.amount - b.amount
      })
  }, [items, search, selectedGroup, sortBy])

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)

  if (!items.length) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Log your first expense to start splitting costs with your group."
        icon={<span aria-hidden className="text-2xl">🧾</span>}
        action={
          <Button asChild>
            <Link href="/expenses/new">Add your first expense</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search description, group, or payer"
            aria-label="Search expenses"
            className="border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full min-w-[180px]">
              <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {groupOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
            <SelectTrigger className="w-full min-w-[180px]">
              <SelectValue aria-label="Sort expenses" placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Newest first</SelectItem>
              <SelectItem value="amount-desc">Amount (high → low)</SelectItem>
              <SelectItem value="amount-asc">Amount (low → high)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background/80 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Description</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {filteredItems.map((expense) => (
                <MotionTableRow
                  key={expense.id}
                  layout
                  {...rowAnimation}
                  className="last:border-b-0"
                >
                  <TableCell className="max-w-[240px] text-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{expense.description}</span>
                      <span className="text-xs text-muted-foreground">
                        #{expense.id.slice(0, 6).toUpperCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.groupName}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.payerName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">
                      {formatCurrency(expense.amount, expense.currency)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.formattedDate}
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="icon" aria-label="Edit expense">
                      <Link href={`/expenses/${expense.id}/edit`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <ConfirmActionDialog
                      action={deleteExpenseAction}
                      fields={[{ name: "expense_id", value: expense.id }]}
                      title="Delete this expense?"
                      description="This will permanently remove the expense from the selected group and rebalance everyone owed."
                      confirmLabel="Delete expense"
                      pendingLabel="Deleting…"
                      tone="destructive"
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete expense ${expense.description}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      }
                      body={
                        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                            <span>{expense.groupName}</span>
                            <span aria-hidden>•</span>
                            <span>{expense.payerName}</span>
                            <span aria-hidden>•</span>
                            <span>{expense.formattedDate}</span>
                          </div>
                          <div className="mt-2 font-medium text-foreground">
                            {formatCurrency(expense.amount, expense.currency)}
                          </div>
                        </div>
                      }
                    />
                  </TableCell>
                </MotionTableRow>
              ))}
            </AnimatePresence>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    subtle
                    title="No expenses match your filters"
                    description="Try adjusting your search term or view another group."
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

