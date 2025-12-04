/**
 * @file page.tsx
 * @description Friends management surface providing invite and removal flows.
 */

import Link from "next/link"
import { Suspense } from "react"

import { requireUser } from "@/lib/auth/session-helpers"
import { listFriends } from "@/lib/friends/api"

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
import { AnimatedDiv, AnimatedSection } from "@/components/common/animated"

import {
  createFriendInviteAction,
} from "./actions"
import { FriendsManager } from "./friends-manager"

type SearchParams = {
  success?: string
  error?: string
}

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

function InviteForm() {
  return (
    <form
      action={createFriendInviteAction}
      className="space-y-5"
    >
      <div className="grid gap-2">
        <Label htmlFor="via" className="text-sm font-medium text-muted-foreground">
          Invite via
        </Label>
        <select
          id="via"
          name="via"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          defaultValue="email"
          required
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="value" className="text-sm font-medium text-muted-foreground">
          Email address or phone number
        </Label>
        <Input
          id="value"
          name="value"
          placeholder="friend@example.com"
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Send invite
      </Button>
    </form>
  )
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  await requireUser()
  const messages = {
    success: decodeMessage((await searchParams)?.success),
    error: decodeMessage((await searchParams)?.error),
  }

  const friends = await listFriends()

  const acceptedFriends = friends.items
    .filter((item) => item.status === "accepted")
    .map((item) => ({
      userId: item.user_id,
      userName: item.user_name ?? item.user_id,
      since: item.since,
    }))

  const pendingInvites = friends.items
    .filter((item) => item.status !== "accepted")
    .map((item) => ({
      id: item.invite_id ?? item.user_id,
      userName: item.user_name ?? item.user_id,
      via: item.via,
      createdAt: item.created_at,
      status: item.status,
    }))

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Friends"
          description="Keep track of the people you split costs with and invite new contacts from one place."
          actions={
            <Button asChild variant="outline">
              <Link href="#invite-friend">Invite someone</Link>
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <AnimatedDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="order-2 lg:order-1"
        >
          <SectionTitle
            title="Your network"
            description="Manage confirmed friends, track pending invites, and keep your list tidy."
          />
          <Card className="mt-4">
            <CardContent className="pt-6">
              <Suspense fallback={<div className="text-sm text-muted-foreground">Loading friends…</div>}>
                <FriendsManager
                  friends={acceptedFriends}
                  pendingInvites={pendingInvites}
                />
              </Suspense>
            </CardContent>
          </Card>
        </AnimatedDiv>

        <AnimatedDiv
          id="invite-friend"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="order-1 lg:order-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Invite someone new</CardTitle>
              <CardDescription>
                Send an invite by email or SMS to start splitting expenses together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>
        </AnimatedDiv>
      </section>
    </PageContainer>
  )
}
