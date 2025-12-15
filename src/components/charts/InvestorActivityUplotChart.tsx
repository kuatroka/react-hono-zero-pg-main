"use client";

import { useEffect, useRef } from "react";
import uPlot from "uplot";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LatencyBadge } from "@/components/LatencyBadge";
import type { CusipQuarterInvestorActivity } from "@/schema";

interface InvestorActivityUplotChartProps {
  data: readonly CusipQuarterInvestorActivity[];
  ticker: string;
  latencyMs?: number | null;
  latencySource?: string;
}

export function InvestorActivityUplotChart({
  data,
  ticker,
  latencyMs,
  latencySource,
}: InvestorActivityUplotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const labels = data.map((item) => item.quarter ?? "Unknown");
    const opened = data.map((item) => item.numOpen ?? 0);
    const closed = data.map((item) => -(item.numClose ?? 0));
    const indices = labels.map((_, idx) => idx);

    const width = containerRef.current.clientWidth;

    const chart = new uPlot(
      {
        title: `Investor Activity (uPlot)` ,
        width,
        height: 400,
        padding: [16, 40, 48, 16],
        legend: { show: true },
        scales: {
          x: { time: false },
          y: { auto: true },
        },
        axes: [
          {
            stroke: "#6b7280",
            grid: { stroke: "rgba(148,163,184,0.25)" },
            values: (_chart, ticks) => ticks.map((t) => labels[Math.round(t)] ?? ""),
            gap: 10,
          },
          {
            stroke: "#6b7280",
            grid: { stroke: "rgba(148,163,184,0.25)" },
            values: (_chart, ticks) => ticks.map((t) => Math.abs(t).toString()),
          },
        ],
        series: [
          {},
          {
            label: "Opened",
            stroke: "#15803d",
            fill: "rgba(22,163,74,0.35)",
            width: 1,
            points: { show: false },
            paths: uPlot.paths.bars!({ size: [0.5, 100], align: 0 }),
          },
          {
            label: "Closed",
            stroke: "#dc2626",
            fill: "rgba(220,38,38,0.3)",
            width: 1,
            points: { show: false },
            paths: uPlot.paths.bars!({ size: [0.5, 100], align: 0 }),
          },
        ],
        cursor: {
          drag: { x: false, y: false },
          focus: { prox: 32 },
        },
      },
      [indices, opened, closed],
      containerRef.current
    );

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && containerRef.current) {
        const nextWidth = containerRef.current.clientWidth;
        chartRef.current.setSize({ width: nextWidth, height: 400 });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, ticker]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Activity for {ticker} (uPlot)</CardTitle>
          <CardDescription>No activity data available</CardDescription>
          {latencySource && (
            <CardAction>
              <LatencyBadge ms={latencyMs ?? null} source={latencySource} />
            </CardAction>
          )}
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Activity for {ticker} (uPlot)</CardTitle>
        <CardDescription>
          Alternative rendering using uPlot with opened (green) vs closed (red) positions.
        </CardDescription>
        {latencySource && (
          <CardAction>
            <LatencyBadge ms={latencyMs ?? null} source={latencySource} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-[400px] w-full" />
      </CardContent>
    </Card>
  );
}
