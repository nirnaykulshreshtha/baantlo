/**
 * @file page.tsx
 * @description Update group settings and review membership.
 */

import Link from "next/link"
import { redirect, notFound } from "next/navigation"

import { requireUser } from "@/lib/auth/session-helpers"
import { getGroup } from "@/lib/groups/api"

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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { updateGroupAction } from "../../actions"

const GROUP_TYPES: { value: string; label: string }[] = [
  { value: "trip", label: "Trip" },
  { value: "home", label: "Home" },
  { value: "couple", label: "Couple" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
]

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

function handleGroupError(error: unknown): never {
  const status =
    typeof (error as { status?: unknown })?.status === "number"
      ? ((error as { status?: number }).status as number)
      : undefined
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unable to load group."

  if (status === 404) {
    notFound()
  }

  const fallback = encodeURIComponent(message)
  redirect(`/groups?error=${fallback}`)
}

export default async function EditGroupPage({
  params,
  searchParams,
}: {
  params: { groupId: string }
  searchParams?: { success?: string; error?: string }
}) {
  await requireUser()
  const group = await getGroup(params.groupId).catch(handleGroupError)

  const success = decodeMessage((await searchParams)?.success)
  const error = decodeMessage((await searchParams)?.error)

  return (
    <PageContainer className="pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title={group.name}
          description="Update group details, change the currency, or review the current members."
          actions={
            <Button asChild variant="outline">
              <Link href="/groups">Back to groups</Link>
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
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Group settings</CardTitle>
              <CardDescription>These details are visible to every member.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTitle
                title="General"
                description="Keep information accurate so members always know what this group is for."
                className="mb-6"
              />
              <form action={updateGroupAction} className="space-y-6">
                <input type="hidden" name="group_id" value={group.group_id} />

                <div className="grid gap-2">
                  <Label htmlFor="name">Group name</Label>
                  <Input id="name" name="name" defaultValue={group.name} required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="group_type">Group type</Label>
                  <select
                    id="group_type"
                    name="group_type"
                    defaultValue={group.group_type.toLowerCase()}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    required
                  >
                    {GROUP_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="base_currency">Currency</Label>
                  <Input
                    id="base_currency"
                    name="base_currency"
                    defaultValue={group.base_currency}
                    maxLength={3}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can only change this if no expenses have been recorded yet.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={group.description ?? ""}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/groups">Cancel</Link>
                  </Button>
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </AnimatedDiv>

        <AnimatedDiv
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Active members and their current status.</CardDescription>
            </CardHeader>
            <CardContent>
              {(group.members ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No members found yet. Send invites from the group details page.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(group.members ?? []).map((member) => (
                      <TableRow key={`${group.group_id}-${member.user_id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.user_name ?? member.user_id}</span>
                            {member.user_email && (
                              <span className="text-xs text-muted-foreground">{member.user_email}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === "owner" ? "default" : "outline"} className="uppercase">
                            {member.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
        </AnimatedDiv>
      </div>
    </PageContainer>
  )
}
