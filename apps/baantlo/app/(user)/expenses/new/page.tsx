/**
 * @file page.tsx
 * @description Create expense page with equal split helper.
 */

import Link from "next/link"

import { requireUser } from "@/lib/auth/session-helpers"
import { listGroups, getGroup } from "@/lib/groups/api"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AnimatedSection } from "@/components/common/animated"

import { ExpenseForm } from "./expense-form"

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const session = await requireUser()
  const error = decodeMessage((await searchParams)?.error)

  const groupSummaries = await listGroups()
  const groupDetails = await Promise.all(
    groupSummaries.items.map(async (summary) => {
      try {
        const detail = await getGroup(summary.group_id)
        return detail
      } catch {
        return null
      }
    })
  )

  const groups = groupDetails
    .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
    .map((detail) => ({
      id: detail.group_id,
      name: detail.name,
      baseCurrency: detail.base_currency,
      members: (detail.members ?? [])
        .filter((member) => member.status === "active")
        .map((member) => ({
          userId: member.user_id,
          name: member.user_name ?? member.user_id,
          email: member.user_email,
        })),
    }))
    .filter((group) => group.members.length > 0)

  const currentUserId =
    (session.user as { id?: string | null })?.id ?? ""

  return (
    <PageContainer className="mx-auto max-w-5xl pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Add expense"
          description="Log a new shared expense, choose who paid, and confirm the split before saving."
          actions={
            <Button asChild variant="outline">
              <Link href="/expenses">Back to expenses</Link>
            </Button>
          }
        />
      </AnimatedSection>

      {error && (
        <AnimatedSection
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Alert variant="destructive" role="alert">
            <AlertTitle>Unable to save expense</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </AnimatedSection>
      )}

      <AnimatedSection
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {groups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No groups available</CardTitle>
              <CardDescription>
                You need an active group with at least one member before recording an expense.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a group or invite members to an existing group, then return here to log expenses.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/groups/new">Create a group</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/groups">View groups</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Expense details</CardTitle>
              <CardDescription>
                Choose the group, amount, and who should split the cost. We&apos;ll preview the split instantly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTitle
                title="Create expense"
                description="All fields are required unless marked optional."
                className="mb-6"
              />
              <ExpenseForm groups={groups} currentUserId={currentUserId} />
            </CardContent>
          </Card>
        )}
      </AnimatedSection>
    </PageContainer>
  )
}
