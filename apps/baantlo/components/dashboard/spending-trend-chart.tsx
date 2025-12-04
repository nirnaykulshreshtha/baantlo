"use client"

import { parseISO, format } from "date-fns"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type SpendingTrendEntry = {
  date: string
  total_amount: number
  user_amount: number
}

type SpendingTrendChartProps = {
  currency: string
  data: SpendingTrendEntry[]
}

const chartConfig: ChartConfig = {
  total_amount: {
    label: "All group spending",
    color: "hsl(var(--chart-1))",
  },
  user_amount: {
    label: "You paid",
    color: "hsl(var(--chart-2))",
  },
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SpendingTrendChart({
  currency,
  data,
}: SpendingTrendChartProps) {
  if (!data.length) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            30-day spending trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">📈</EmptyMedia>
              <EmptyTitle>Nothing to chart yet</EmptyTitle>
              <EmptyDescription>
                As you add expenses we&apos;ll plot how your spending evolves
                day by day.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  const prepared = data.map((entry) => {
    const parsed = parseISO(entry.date)
    return {
      ...entry,
      dayLabel: format(parsed, "MMM d"),
      tooltipLabel: format(parsed, "d MMM yyyy"),
    }
  })

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          30-day spending trend
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="w-full">
          <AreaChart data={prepared} margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value, currency)}
              width={80}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  hideLabel
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.tooltipLabel ?? ""
                  }
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground text-xs">
                        {name === "total_amount"
                          ? chartConfig.total_amount.label
                          : chartConfig.user_amount.label}
                      </span>
                      <span className="text-foreground font-mono text-sm font-medium">
                        {formatCurrency(Number(value), currency)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="total_amount"
              stroke="var(--color-total_amount)"
              fill="var(--color-total_amount)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="user_amount"
              stroke="var(--color-user_amount)"
              fill="var(--color-user_amount)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <ChartLegend
              verticalAlign="top"
              align="right"
              content={<ChartLegendContent />}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
