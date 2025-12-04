/**
 * @file page.tsx
 * @description Expense list with quick actions to edit or delete entries.
 */

import Link from "next/link"

import { requireUser } from "@/lib/auth/session-helpers"
import { listExpenses } from "@/lib/expenses/api"
import { listGroups } from "@/lib/groups/api"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnimatedSection } from "@/components/common/animated"

import { ExpensesTable } from "./expenses-table"

type SearchParams = {
  success?: string
  error?: string
}

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

function formatDate(value: string) {
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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  await requireUser()

  const messages = {
    success: decodeMessage((await searchParams)?.success),
    error: decodeMessage((await searchParams)?.error),
  }

  const [expenses, groups] = await Promise.all([listExpenses(), listGroups()])
  const groupNameMap = new Map(groups.items.map((group) => [group.group_id, group.name]))

  const mappedExpenses = expenses.items.map((expense) => ({
    id: expense.id,
    description: expense.description,
    groupId: expense.group_id,
    groupName: groupNameMap.get(expense.group_id) ?? expense.group_id,
    payerName: expense.payer_name ?? expense.payer_id,
    currency: expense.currency,
    amount: expense.amount,
    expenseDate: expense.expense_date,
    formattedDate: formatDate(expense.expense_date),
  }))

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Expenses"
          description="Review, filter, and edit shared expenses across every group."
          actions={
            <Button asChild size="lg">
              <Link href="/expenses/new">Add expense</Link>
            </Button>
          }
        />
      </AnimatedSection>

      {(messages.success || messages.error) && (
        <AnimatedSection
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Alert variant={messages.error ? "destructive" : "default"} role="status">
            <AlertTitle>{messages.error ? "Something went wrong" : "Success"}</AlertTitle>
            <AlertDescription>{messages.error ?? messages.success}</AlertDescription>
          </Alert>
        </AnimatedSection>
      )}

      <AnimatedSection
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-4"
      >
        <SectionTitle
          title="Recent entries"
          description="Use the quick filters to find a transaction or jump directly into editing."
        />
        <ExpensesTable items={mappedExpenses} />
      </AnimatedSection>
    </PageContainer>
  )
}
