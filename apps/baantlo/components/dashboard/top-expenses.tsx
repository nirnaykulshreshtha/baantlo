import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"

import type { z } from "zod"
import type { DashboardStatsSchema } from "@/lib/dashboard/schema"

type TopExpense = z.infer<typeof DashboardStatsSchema>["top_expenses"][number]

type TopExpensesProps = {
  currency: string
  items: TopExpense[]
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function TopExpensesTable({ currency, items }: TopExpensesProps) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Largest expenses this month
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">🧮</EmptyMedia>
              <EmptyTitle>No large expenses recorded</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Largest expenses this month
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[380px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{expense.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(expense.expense_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{expense.payer_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {expense.group_name}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {expense.is_paid_by_user ? (
                      <Badge variant="outline">You</Badge>
                    ) : null}
                    <span className="font-medium">
                      {formatCurrency(expense.amount, currency)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
