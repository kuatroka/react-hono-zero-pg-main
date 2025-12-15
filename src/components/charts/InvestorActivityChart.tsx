"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LatencyBadge } from "@/components/LatencyBadge";
import type { CusipQuarterInvestorActivity } from "@/schema";

interface InvestorActivityChartProps {
  data: readonly CusipQuarterInvestorActivity[];
  ticker: string;
  latencyMs?: number | null;
  latencySource?: string;
}

const chartConfig = {
  opened: {
    label: "Opened Positions",
    color: "hsl(142, 76%, 36%)", // green
  },
  closed: {
    label: "Closed Positions",
    color: "hsl(0, 84%, 60%)", // red
  },
} satisfies ChartConfig;

export function InvestorActivityChart({
  data,
  ticker,
  latencyMs,
  latencySource,
}: InvestorActivityChartProps) {
  // Transform data: opens are positive, closes are negative
  const chartData = data.map((item) => ({
    quarter: item.quarter,
    opened: item.numOpen ?? 0,
    closed: -(item.numClose ?? 0), // negative for below axis
    numAdd: item.numAdd ?? 0,
    numReduce: item.numReduce ?? 0,
    numHold: item.numHold ?? 0,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Activity (Recharts)</CardTitle>
          <CardDescription>No activity data available for {ticker}</CardDescription>
          {latencySource && (
            <CardAction>
              <LatencyBadge ms={latencyMs ?? null} source={latencySource} />
            </CardAction>
          )}
        </CardHeader>
      </Card>
    );
  }

  // Find max absolute value for symmetric axis
  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(Math.abs(d.opened), Math.abs(d.closed)))
  );
  const yDomain = [-maxValue * 1.1, maxValue * 1.1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Activity for {ticker} (Recharts)</CardTitle>
        <CardDescription>
          Number of institutional investors opening (green) vs closing (red) positions by quarter
        </CardDescription>
        {latencySource && (
          <CardAction>
            <LatencyBadge ms={latencyMs ?? null} source={latencySource} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              stackOffset="sign"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="quarter"
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={yDomain}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => Math.abs(value).toString()}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const absValue = Math.abs(Number(value));
                      const label = name === "opened" ? "Opened" : "Closed";
                      return [`${absValue} investors`, label];
                    }}
                  />
                }
              />
              <Bar
                dataKey="opened"
                stackId="activity"
                fill={chartConfig.opened.color}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="closed"
                stackId="activity"
                fill={chartConfig.closed.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
