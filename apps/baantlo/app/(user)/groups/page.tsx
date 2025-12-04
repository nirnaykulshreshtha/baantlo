/**
 * @file page.tsx
 * @description Group management area with quick access to edit or archive groups.
 */

import Link from "next/link"

import { requireUser } from "@/lib/auth/session-helpers"
import { listGroups } from "@/lib/groups/api"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnimatedSection } from "@/components/common/animated"

import { GroupsGrid } from "./groups-grid"

type SearchParams = {
  success?: string
  error?: string
}

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  await requireUser()
  const messages = {
    success: decodeMessage((await searchParams)?.success),
    error: decodeMessage((await searchParams)?.error),
  }

  const groups = await listGroups()

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Groups"
          description="Create dedicated spaces for your trips, households, teams, or any crew that splits costs."
          actions={
            <Button asChild size="lg">
              <Link href="/groups/new">Create group</Link>
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="space-y-4"
      >
        <SectionTitle
          title="All groups"
          description="Filter by role or group type to quickly locate what you need to manage."
        />
        <GroupsGrid
          items={groups.items.map((group) => ({
            id: group.group_id,
            name: group.name,
            type: group.group_type.toLowerCase(),
            baseCurrency: group.base_currency,
            role: group.role,
            unreadCount: group.unread_count ?? null,
          }))}
        />
      </AnimatedSection>
    </PageContainer>
  )
}
