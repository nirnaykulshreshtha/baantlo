"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Info, Users } from "lucide-react"

import { createExpenseAction } from "../actions"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

type ExpenseSplitPreview = {
  userId: string
  amount: number
}

function computeEqualSplits(totalAmount: number, memberIds: string[]): ExpenseSplitPreview[] {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || memberIds.length === 0) {
    return memberIds.map((userId) => ({ userId, amount: 0 }))
  }
  const totalCents = Math.round(totalAmount * 100)
  const baseCents = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - baseCents * memberIds.length

  return memberIds.map((userId, index) => {
    const extra = index < remainder ? 1 : 0
    return {
      userId,
      amount: (baseCents + extra) / 100,
    }
  })
}

export function ExpenseForm({
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
  const [description, setDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? firstGroup,
    [groups, selectedGroupId, firstGroup]
  )

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    activeGroup?.members.map((member) => member.userId) ?? []
  )
  const [payerId, setPayerId] = useState<string>(() => {
    if (!activeGroup) return currentUserId
    const hasCurrentUser = activeGroup.members.some((member) => member.userId === currentUserId)
    return hasCurrentUser ? currentUserId : activeGroup.members[0]?.userId ?? currentUserId
  })
  const [isSplitTouched, setIsSplitTouched] = useState(false)

  useEffect(() => {
    setCurrency(activeGroup?.baseCurrency ?? "INR")
    const members = activeGroup?.members.map((member) => member.userId) ?? []
    setSelectedMemberIds(members)
    const hasCurrentUser = members.includes(currentUserId)
    setPayerId(hasCurrentUser ? currentUserId : members[0] ?? currentUserId)
  }, [activeGroup, currentUserId])

  const splits = useMemo(() => {
    const total = Number(amount)
    if (!selectedMemberIds.length) {
      return []
    }
    return computeEqualSplits(total, selectedMemberIds)
  }, [amount, selectedMemberIds])

  const splitsJson = useMemo(
    () =>
      JSON.stringify(
        splits.map((split) => ({
          userId: split.userId,
          amount: split.amount,
        }))
      ),
    [splits]
  )

  const handleMemberToggle = (memberId: string, checked: boolean) => {
    setSelectedMemberIds((prev) => {
      if (checked) {
        if (prev.includes(memberId)) return prev
        setIsSplitTouched(true)
        return [...prev, memberId]
      }
      setIsSplitTouched(true)
      return prev.filter((id) => id !== memberId)
    })
  }

  const handleSelectAllMembers = (checked: boolean) => {
    if (!activeGroup) return
    setIsSplitTouched(true)
    setSelectedMemberIds(checked ? activeGroup.members.map((member) => member.userId) : [])
  }

  const allMembersSelected =
    selectedMemberIds.length === (activeGroup?.members.length ?? 0) &&
    selectedMemberIds.length > 0

  const splitStatusLabel =
    selectedMemberIds.length === 0
      ? "No members selected"
      : `${selectedMemberIds.length} participant${selectedMemberIds.length === 1 ? "" : "s"} splitting`

  const splitStatusTone =
    selectedMemberIds.length === 0
      ? "text-destructive"
      : "text-emerald-600 dark:text-emerald-400"

  return (
    <form action={createExpenseAction} className="space-y-6">
      <input type="hidden" name="splits" value={splitsJson} />

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
          <Label htmlFor="payer_id">Paid by</Label>
          <select
            id="payer_id"
            name="payer_id"
            required
            value={payerId}
            onChange={(event) => setPayerId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {(activeGroup?.members ?? []).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Keep this in sync with who actually paid to maintain accurate balances.
          </p>
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

      <div className="grid gap-2">
        <Label htmlFor="description" className="flex items-center gap-2">
          Description
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Keep it short and descriptive so everyone recognises the expense.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="description"
          name="description"
          placeholder="Dinner at Fisherman's Wharf"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expense_date">Expense date</Label>
        <Input
          id="expense_date"
          name="expense_date"
          type="date"
          value={expenseDate}
          onChange={(event) => setExpenseDate(event.target.value)}
          required
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Label className="flex items-center gap-2">
            Split with
            <Badge variant="secondary" className={splitStatusTone}>
              {splitStatusLabel}
            </Badge>
          </Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select_all_members"
              checked={allMembersSelected}
              onCheckedChange={(checked) => handleSelectAllMembers(Boolean(checked))}
            />
            <label htmlFor="select_all_members" className="cursor-pointer text-sm text-muted-foreground">
              Select all members
            </label>
          </div>
        </div>
        <div className="grid gap-2">
          {(activeGroup?.members ?? []).map((member) => {
            const checked = selectedMemberIds.includes(member.userId)
            return (
              <motion.label
                key={member.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-lg border border-input p-3 text-sm transition hover:border-primary"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(state) => handleMemberToggle(member.userId, Boolean(state))}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  {member.email && (
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  )}
                </div>
              </motion.label>
            )
          })}
        </div>
        {selectedMemberIds.length === 0 && (
          <p className="text-xs text-destructive">Select at least one member to split the expense.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Split preview</Label>
        <div
          className="grid gap-2 rounded-lg border border-dashed bg-muted/20 p-4 text-sm"
          aria-live="polite"
        >
          <AnimatePresence initial={false}>
            {splits.length === 0 ? (
              <motion.p
                key="no-members"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground"
              >
                {isSplitTouched
                  ? "No members selected. Choose at least one to split the expense."
                  : "Select members above to see how the amount will be shared."}
              </motion.p>
            ) : (
              splits.map((split) => {
                const member = activeGroup?.members.find((item) => item.userId === split.userId)
                return (
                  <motion.div
                    key={split.userId}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2 shadow-xs"
                  >
                    <span className="flex items-center gap-2 text-foreground">
                      <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {member?.name ?? split.userId}
                    </span>
                    <Badge variant="outline">
                      {currency} {split.amount.toFixed(2)}
                    </Badge>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/expenses">Cancel</Link>
        </Button>
        <Button type="submit" disabled={!selectedMemberIds.length}>
          Save expense
        </Button>
      </div>
    </form>
  )
}
