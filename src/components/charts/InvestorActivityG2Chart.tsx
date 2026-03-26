"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CusipQuarterInvestorActivity } from "@/schema";

interface InvestorActivityG2ChartProps {
  data: readonly CusipQuarterInvestorActivity[];
  ticker: string;
}

export function InvestorActivityG2Chart({ data, ticker }: InvestorActivityG2ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;
    return () => {
      chartRef.current = null;
    };
  }, [data, ticker]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Activity for {ticker} (G2)</CardTitle>
          <CardDescription>No activity data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Activity for {ticker} (G2)</CardTitle>
        <CardDescription>
          Alternative rendering using AntV G2 with opened (green) vs closed (red) positions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-[400px] w-full" />
      </CardContent>
    </Card>
  );
}
