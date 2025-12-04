import Link from "next/link"
import { Wallet } from "lucide-react"

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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { DashboardBalanceItem } from "@/lib/dashboard/schema"

type BalanceBreakdownProps = {
  currency: string
  items: DashboardBalanceItem[]
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export function BalanceBreakdownTable({
  currency,
  items,
}: BalanceBreakdownProps) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Balances by friend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">🤝</EmptyMedia>
              <EmptyTitle>Everyone&apos;s square</EmptyTitle>
              <EmptyDescription>
                Once you start splitting expenses, we&apos;ll show who owes what
                so you can settle up quickly.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              Invite someone to a group or log your first shared expense to see
              balances here.
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold">
          Balances by friend
        </CardTitle>
        <Badge variant="outline">Top {Math.min(items.length, 6)}</Badge>
      </CardHeader>
      <CardContent className="max-h-[360px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Counterparty</TableHead>
              <TableHead>Involved groups</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[120px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, 6).map((item) => {
              const isPositive = item.amount_inr > 0
              return (
                <TableRow key={item.user_id}>
                  <TableCell className="font-medium">
                    {item.user_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.groups_count ?? 1} group
                    {(item.groups_count ?? 1) !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {isPositive ? "Owes you " : "You owe "}
                      {formatCurrency(item.amount_inr, currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5"
                    >
                      <Link
                        href={`/settlements/new?user_id=${item.user_id}`}
                        title={isPositive ? "Request payment" : "Pay now"}
                      >
                        <Wallet className="size-3.5" />
                        <span className="sr-only">
                          {isPositive ? "Request payment" : "Pay now"}
                        </span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
