"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRightLeft, Wallet2 } from "lucide-react"

import { createSettlementAction } from "../actions"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type GroupMember = {
  userId: string
  name: string
  email?: string | null
}

type GroupOption = {
  id: string
  name: string
  baseCurrency: string
  members: GroupMember[]
}

export function SettlementForm({
  groups,
  currentUserId,
}: {
  groups: GroupOption[]
  currentUserId: string
}) {
  const firstGroup = groups[0]
  const [selectedGroupId, setSelectedGroupId] = useState(firstGroup?.id ?? "")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(firstGroup?.baseCurrency ?? "INR")
  const [notes, setNotes] = useState("")
  const [method, setMethod] = useState<"cash" | "upi" | "bank_transfer">("upi")
  const [fromUserId, setFromUserId] = useState<string>("")
  const [toUserId, setToUserId] = useState<string>("")

  const activeGroup = groups.find((group) => group.id === selectedGroupId) ?? firstGroup
  const fromMember = useMemo(
    () => activeGroup?.members.find((member) => member.userId === fromUserId),
    [activeGroup?.members, fromUserId],
  )
  const toMember = useMemo(
    () => activeGroup?.members.find((member) => member.userId === toUserId),
    [activeGroup?.members, toUserId],
  )

  useEffect(() => {
    if (!activeGroup) return
    setCurrency(activeGroup.baseCurrency)
    if (activeGroup.members.length === 0) {
      setFromUserId("")
      setToUserId("")
      return
    }

    const members = activeGroup.members
    const defaultFrom =
      members.find((member) => member.userId === currentUserId)?.userId ??
      members[0]?.userId ??
      ""
    const defaultTo =
      members.find((member) => member.userId !== defaultFrom)?.userId ??
      members[0]?.userId ??
      ""
    setFromUserId(defaultFrom)
    setToUserId(defaultTo)
  }, [activeGroup, currentUserId])

  const disableSubmit =
    !amount || !fromUserId || !toUserId || fromUserId === toUserId

  return (
    <form action={createSettlementAction} className="space-y-6">
      <input type="hidden" name="notes" value={notes} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="group_id">Group</Label>
          <select
            id="group_id"
            name="group_id"
            required
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            name="method"
            value={method}
            onChange={(event) => setMethod(event.target.value as typeof method)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="from_user_id">From</Label>
          <select
            id="from_user_id"
            name="from_user_id"
            required
            value={fromUserId}
            onChange={(event) => setFromUserId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {(activeGroup?.members ?? []).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="to_user_id">To</Label>
          <select
            id="to_user_id"
            name="to_user_id"
            required
            value={toUserId}
            onChange={(event) => setToUserId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {(activeGroup?.members ?? []).map((member) => (
              <option
                key={member.userId}
                value={member.userId}
                disabled={member.userId === fromUserId}
              >
                {member.name}
              </option>
            ))}
          </select>
          {fromUserId === toUserId && (
            <p className="text-xs text-destructive">
              Choose two different members.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            name="currency"
            maxLength={3}
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="uppercase"
            required
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm"
      >
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <Wallet2 className="size-4" aria-hidden="true" />
          <span>{activeGroup?.name ?? "Select a group"} • {currency}</span>
          <span aria-hidden>•</span>
          <Badge variant="outline" className="uppercase">
            {method.replace("_", " ")}
          </Badge>
        </div>
        <AnimatePresence mode="wait">
          {fromMember && toMember ? (
            <motion.div
              key={`${fromMember.userId}-${toMember.userId}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 flex flex-wrap items-center gap-2 text-base font-medium text-foreground"
            >
              <span>{fromMember.name}</span>
              <ArrowRightLeft className="size-4 text-muted-foreground" aria-hidden="true" />
              <span>{toMember.name}</span>
            </motion.div>
          ) : (
            <motion.p
              key="select-participants"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-muted-foreground"
            >
              Choose who paid whom to preview the settlement.
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {amount ? (
            <motion.div
              key={amount}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2 text-lg font-semibold"
            >
              {currency}{" "}
              {Number(amount).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any context for this settlement."
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/settlements">Cancel</Link>
        </Button>
        <Button type="submit" disabled={disableSubmit}>
          Save settlement
        </Button>
      </div>
    </form>
  )
}

