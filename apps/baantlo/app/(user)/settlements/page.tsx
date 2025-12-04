/**
 * @file page.tsx
 * @description Settlements overview with shortcuts to complete or cancel pending items.
 */

import Link from "next/link"

import { requireUser } from "@/lib/auth/session-helpers"
import { listSettlements } from "@/lib/settlements/api"
import { listGroups } from "@/lib/groups/api"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnimatedSection } from "@/components/common/animated"

import { SettlementsTable } from "./settlements-table"

type SearchParams = {
  success?: string
  error?: string
}

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  await requireUser()

  const messages = {
    success: decodeMessage((await searchParams)?.success),
    error: decodeMessage((await searchParams)?.error),
  }

  const [settlements, groups] = await Promise.all([listSettlements(), listGroups()])
  const groupNameMap = new Map(groups.items.map((group) => [group.group_id, group.name]))

  const mappedSettlements = settlements.items.map((settlement) => ({
    id: settlement.id,
    groupId: settlement.group_id,
    groupName: groupNameMap.get(settlement.group_id) ?? settlement.group_id,
    from: settlement.from_user_name ?? settlement.from_user_id,
    to: settlement.to_user_name ?? settlement.to_user_id,
    amount: settlement.amount,
    currency: settlement.currency,
    method: settlement.method,
    status: settlement.status,
    createdAt: settlement.created_at,
    settledAt: settlement.settled_at,
  }))

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Settlements"
          description="Track pending and completed settlements across your groups to keep balances accurate."
          actions={
            <Button asChild size="lg">
              <Link href="/settlements/new">Record settlement</Link>
            </Button>
          }
        />
      </AnimatedSection>

      {(messages.success || messages.error) && (
        <AnimatedSection
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Alert variant={messages.error ? "destructive" : "default"}>
            <AlertTitle>{messages.error ? "Something went wrong" : "Success"}</AlertTitle>
            <AlertDescription>{messages.error ?? messages.success}</AlertDescription>
          </Alert>
        </AnimatedSection>
      )}

      <AnimatedSection
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="space-y-4"
      >
        <SectionTitle
          title="Overview"
          description="Filter by status to unblock pending settlements quickly."
        />
        <SettlementsTable items={mappedSettlements} />
      </AnimatedSection>
    </PageContainer>
  )
}
