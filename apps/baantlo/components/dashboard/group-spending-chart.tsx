"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type GroupSpendingEntry = {
  group_name: string
  group_id: string
  amount: number
  expense_count: number
}

type GroupSpendingChartProps = {
  currency: string
  data: GroupSpendingEntry[]
}

const chartConfig: ChartConfig = {
  amount: {
    label: "Amount spent",
    color: "hsl(var(--chart-3))",
  },
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function GroupSpendingChart({
  currency,
  data,
}: GroupSpendingChartProps) {
  if (!data.length) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Top groups by spending
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">🧑‍🤝‍🧑</EmptyMedia>
              <EmptyTitle>Create or join a group</EmptyTitle>
              <EmptyDescription>
                Focus your attention on the groups that move the most money by
                splitting expenses together.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              Once groups are active, we&apos;ll highlight which ones need your
              attention here.
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  const prepared = data.slice(0, 6).map((item) => ({
    ...item,
    label: item.group_name,
  }))

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Top groups by spending
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="w-full">
          <BarChart
            data={prepared}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value, currency)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.2 }}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, payload) => (
                    <div className="flex w-full flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {payload?.payload?.group_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {payload?.payload?.expense_count} expense
                        {payload?.payload?.expense_count === 1 ? "" : "s"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(Number(value), currency)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={6}
              barSize={20}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
