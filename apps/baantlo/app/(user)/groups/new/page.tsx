/**
 * @file page.tsx
 * @description Form for creating a new expense group.
 */

import Link from "next/link"

import { requireUser } from "@/lib/auth/session-helpers"

import { PageContainer, PageHeader, SectionTitle } from "@/components/layouts/page-structure"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AnimatedSection } from "@/components/common/animated"

import { createGroupAction } from "../actions"

const GROUP_TYPES: { value: string; label: string; helper: string }[] = [
  { value: "trip", label: "Trip", helper: "Weekend getaways or long adventures." },
  { value: "home", label: "Home", helper: "Roommates or household expenses." },
  { value: "couple", label: "Couple", helper: "Shared finances with your partner." },
  { value: "personal", label: "Personal", helper: "Track individual budgets or categories." },
  { value: "business", label: "Business", helper: "Company or project expenses." },
  { value: "event", label: "Event", helper: "Weddings, birthdays, or celebrations." },
  { value: "other", label: "Other", helper: "Anything that doesn&apos;t fit above." },
]

function decodeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined
  return decodeURIComponent(value.replace(/\+/g, " "))
}

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  await requireUser()

  const error = decodeMessage((await searchParams)?.error)

  return (
    <PageContainer className="mx-auto max-w-3xl pb-10">
      <AnimatedSection
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Create a group"
          description="Choose a name, select the type, and set a default currency. You can invite others once the group is created."
          actions={
            <Button asChild variant="outline">
              <Link href="/groups">Cancel</Link>
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
            <AlertTitle>Unable to create group</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </AnimatedSection>
      )}

      <AnimatedSection
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Group details</CardTitle>
            <CardDescription>Fill in the basics. You can always update these later.</CardDescription>
          </CardHeader>
          <CardContent>
            <SectionTitle
              title="General information"
              description="These settings help members understand the context of your group."
              className="mb-6"
            />
            <form action={createGroupAction} className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Group name</Label>
                <Input id="name" name="name" placeholder="e.g. Goa Trip" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="group_type">Group type</Label>
                <div className="grid gap-2">
                  <select
                    id="group_type"
                    name="group_type"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    required
                    defaultValue="trip"
                  >
                    {GROUP_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Pick the option that best matches your use case.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="base_currency">Currency</Label>
                <Input
                  id="base_currency"
                  name="base_currency"
                  placeholder="INR"
                  defaultValue="INR"
                  maxLength={3}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  The default currency used for expenses in this group (ISO code).
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Add a quick description or purpose for this group."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/groups">Back</Link>
                </Button>
                <Button type="submit">Create group</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AnimatedSection>
    </PageContainer>
  )
}
