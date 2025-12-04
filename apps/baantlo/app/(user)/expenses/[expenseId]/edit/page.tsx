/**
 * @file page.tsx
 * @description Edit an existing expense (description and date) and review splits.
 */

import Link from "next/link"

import { requireUser } from "@/lib/auth/session-helpers"
import { getExpense } from "@/lib/expenses/api"
import { listGroups } from "@/lib/groups/api"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { AnimatedDiv, AnimatedSection } from "@/components/common/animated"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { updateExpenseAction } from "../../actions"

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: { expenseId: string }
  searchParams?: { success?: string; error?: string }
}) {
  await requireUser()

  const expense = await getExpense(params.expenseId)
  const groups = await listGroups()
  const groupName =
    groups.items.find((group) => group.group_id === expense.group_id)?.name ?? expense.group_id

  const success = decodeMessage((await searchParams)?.success)
  const error = decodeMessage((await searchParams)?.error)

  const expenseDate = new Date(expense.expense_date)
  const dateInputValue = Number.isNaN(expenseDate.getTime())
    ? ""
    : expenseDate.toISOString().slice(0, 10)

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title={expense.description}
          description="Adjust the description or date, or review how the expense is currently split."
          actions={
            <Button asChild variant="outline">
              <Link href="/expenses">Back to expenses</Link>
            </Button>
          }
        />
      </AnimatedSection>

      {(success || error) && (
        <AnimatedSection
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Alert variant={error ? "destructive" : "default"}>
            <AlertTitle>{error ? "Something went wrong" : "Saved"}</AlertTitle>
            <AlertDescription>{error ?? success}</AlertDescription>
          </Alert>
        </AnimatedSection>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <AnimatedDiv
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Expense details</CardTitle>
              <CardDescription>Amount and payer are locked; edit the description or date as needed.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateExpenseAction} className="space-y-6">
                <input type="hidden" name="expense_id" value={expense.id} />

                <div className="grid gap-2">
                  <Label>Group</Label>
                  <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    {groupName}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Amount</Label>
                  <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    {formatCurrency(expense.amount, expense.currency)} (paid by{" "}
                    {expense.payer_name ?? expense.payer_id})
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" defaultValue={expense.description} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expense_date">Date</Label>
                  <Input id="expense_date" name="expense_date" type="date" defaultValue={dateInputValue} required />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/expenses">Cancel</Link>
                  </Button>
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </AnimatedDiv>

        <AnimatedDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Current split</CardTitle>
              <CardDescription>How the expense is distributed across members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SectionTitle
                title="Breakdown"
                description="Splits are calculated from the original expense."
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expense.splits.map((split) => (
                    <TableRow key={`${expense.id}-${split.user_id}`}>
                      <TableCell>{split.user_name ?? split.user_id}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {formatCurrency(split.amount, expense.currency)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedDiv>
      </div>
    </PageContainer>
  )
}
