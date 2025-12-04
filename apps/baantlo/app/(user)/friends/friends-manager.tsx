"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarClock, Mail, User } from "lucide-react"

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { deleteFriendAction } from "./actions"

type FriendItem = {
  userId: string
  userName: string
  since?: string | null
}

type InviteItem = {
  id: string
  userName: string
  via?: string | null
  createdAt?: string | null
  status: string
}

type FriendsManagerProps = {
  friends: FriendItem[]
  pendingInvites: InviteItem[]
}

const MotionCard = motion(Card)

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function FriendsManager({ friends, pendingInvites }: FriendsManagerProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "pending">("friends")
  const [search, setSearch] = useState("")

  const filteredFriends = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return friends
    return friends.filter((friend) =>
      friend.userName.toLowerCase().includes(term),
    )
  }, [friends, search])

  const filteredInvites = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pendingInvites
    return pendingInvites.filter((invite) =>
      invite.userName.toLowerCase().includes(term),
    )
  }, [pendingInvites, search])

  const nothingToShow =
    (activeTab === "friends" && filteredFriends.length === 0) ||
    (activeTab === "pending" && filteredInvites.length === 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "friends" | "pending")}
          className="w-full md:w-auto"
        >
          <TabsList>
            <TabsTrigger value="friends">
              Friends <Badge variant="secondary" className="ml-2">{friends.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending invites <Badge variant="secondary" className="ml-2">{pendingInvites.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
          <span aria-hidden className="text-muted-foreground">🔍</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              activeTab === "friends"
                ? "Search friends"
                : "Search pending invites"
            }
            aria-label="Search by name"
            className="border-none px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {nothingToShow ? (
        <EmptyState
          subtle
          title={
            activeTab === "friends"
              ? "No friends match your search"
              : "No pending invites match your search"
          }
          description="Try adjusting your search terms."
        />
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "friends" | "pending")} className="space-y-6">
        <TabsContent value="friends" className="space-y-4">
          <AnimatePresence>
            {filteredFriends.length === 0 ? null : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredFriends.map((friend, index) => {
                  const since = formatDate(friend.since ?? null)
                  return (
                    <MotionCard
                      key={friend.userId}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="border bg-background/80 shadow-sm backdrop-blur"
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                            <User className="size-5" aria-hidden="true" />
                          </span>
                          <div className="space-y-1">
                            <div className="text-base font-semibold">
                              {friend.userName}
                            </div>
                            {since ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CalendarClock className="size-3.5" aria-hidden="true" />
                                Friends since {since}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Recently connected
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <ConfirmActionDialog
                            action={deleteFriendAction}
                            fields={[{ name: "user_id", value: friend.userId }]}
                            title={`Remove ${friend.userName}?`}
                            description="They will be removed from all shared groups but existing expenses will remain."
                            confirmLabel="Remove friend"
                            pendingLabel="Removing…"
                            tone="destructive"
                            trigger={
                              <Button variant="outline" type="button">
                                Remove
                              </Button>
                            }
                          />
                        </div>
                      </CardContent>
                    </MotionCard>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredInvites.length === 0 ? (
            <EmptyState
              subtle
              title="No pending invites right now"
              description="Send a new invite to start a shared expense history."
            />
          ) : (
            <div className="space-y-3">
              {filteredInvites.map((invite) => {
                const created = formatDate(invite.createdAt ?? null)
                return (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col gap-3 rounded-2xl border bg-background/70 p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="text-sm font-semibold">{invite.userName}</div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3.5" aria-hidden="true" />
                          {invite.via === "phone" ? "SMS invite" : "Email invite"}
                        </span>
                        {created ? (
                          <>
                            <span aria-hidden>•</span>
                            <span>{created}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant="outline" className="self-start uppercase lg:self-auto">
                      {invite.status}
                    </Badge>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

