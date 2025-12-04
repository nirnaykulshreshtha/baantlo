/**
 * @file page.tsx
 * @description Form for recording a new settlement between members.
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

import { SettlementForm } from "./settlement-form"

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

export default async function NewSettlementPage({
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
    .filter((group) => group.members.length >= 2)

  const currentUserId =
    (session.user as { id?: string | null })?.id ?? ""

  return (
    <PageContainer className="mx-auto max-w-3xl pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Record a settlement"
          description="Track repayments between members so everyone stays in sync."
          actions={
            <Button asChild variant="outline">
              <Link href="/settlements">Back to settlements</Link>
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
          <Alert variant="destructive">
            <AlertTitle>Unable to create settlement</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </AnimatedSection>
      )}

      <AnimatedSection
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        {groups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No eligible groups</CardTitle>
              <CardDescription>
                Settlements require a group with at least two active members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invite more members to your groups or create a new group, then return here to settle up.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/groups/new">Create a group</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/groups">Manage groups</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Settlement details</CardTitle>
              <CardDescription>Choose the members involved and how the amount was paid.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTitle
                title="Create settlement"
                description="We’ll update outstanding balances as soon as you save."
                className="mb-6"
              />
              <SettlementForm groups={groups} currentUserId={currentUserId} />
            </CardContent>
          </Card>
        )}
      </AnimatedSection>
    </PageContainer>
  )
}
