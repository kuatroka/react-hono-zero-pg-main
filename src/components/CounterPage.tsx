import { Link } from "react-router-dom";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useState } from "react";
import { queries } from "../zero/queries";
import { QuarterChart } from "./charts/QuarterChart";
import { chartMetaList } from "./charts/factory";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Schema } from "../schema";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LatencyBadge } from "@/components/LatencyBadge";
import { useLatencyMs } from "@/lib/latency";

export function CounterPage({ onReady }: { onReady: () => void }) {
  const z = useZero<Schema>();
  const isLoggedIn = z.userID !== "anon";
  const userCounterKey = isLoggedIn ? z.userID : "__guest__";
  const [guestCounter, setGuestCounter] = useState(0);
  
  useEffect(() => {
    if (isLoggedIn) {
      setGuestCounter(0);
    }
  }, [isLoggedIn]);
  
  const handleLogin = async () => {
    try {
      await fetch("/api/login");
      location.reload();
    } catch (error) {
      alert(`Failed to login: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const [counterRows, counterResult] = useQuery(queries.counterCurrent("main"));
  const [userCounterRows, userCounterResult] = useQuery(queries.userCounter(userCounterKey));
  const [quarters, quartersResult] = useQuery(queries.quartersSeries());

  const counterReady = Boolean((counterRows && counterRows.length > 0) || counterResult.type === "complete");
  const counterLatencyMs = useLatencyMs({ isReady: counterReady, resetKey: "counter:main" });

  const userCounterReady = Boolean(
    (userCounterRows && userCounterRows.length > 0) || userCounterResult.type === "complete"
  );
  const userCounterLatencyMs = useLatencyMs({
    isReady: userCounterReady,
    resetKey: `userCounter:${userCounterKey}`,
  });

  const quartersReady = Boolean((quarters && quarters.length > 0) || quartersResult.type === "complete");
  const quartersLatencyMs = useLatencyMs({ isReady: quartersReady, resetKey: "quarters:series" });

  // Signal ready when data is available (from cache or server)
  useEffect(() => {
    if (counterRows && counterRows.length > 0 && quarters && quarters.length > 0 || 
        (counterResult.type === 'complete' && quartersResult.type === 'complete')) {
      onReady();
    }
  }, [counterRows, quarters, counterResult.type, quartersResult.type, onReady]);

  const counter = counterRows[0];
  const userCounter = isLoggedIn ? userCounterRows[0] : undefined;
  const privateCounterValue = isLoggedIn ? userCounter?.value ?? 0 : guestCounter;

  const handleIncrement = async () => {
    if (!counter) return;
    await z.mutate.counters.update({
      id: counter.id,
      value: counter.value + 1,
    });
  };

  const handleDecrement = async () => {
    if (!counter) return;
    await z.mutate.counters.update({
      id: counter.id,
      value: counter.value - 1,
    });
  };

  const handleUserIncrement = async () => {
    if (!isLoggedIn) {
      setGuestCounter((value) => value + 1);
      return;
    }
    const currentValue = userCounter?.value ?? 0;
    if (userCounter) {
      await z.mutate.user_counters.update({
        userId: z.userID,
        value: currentValue + 1,
      });
    } else {
      await z.mutate.user_counters.insert({
        userId: z.userID,
        value: 1,
      });
    }
  };

  const handleUserDecrement = async () => {
    if (!isLoggedIn) {
      setGuestCounter((value) => value - 1);
      return;
    }
    const currentValue = userCounter?.value ?? 0;
    if (userCounter) {
      await z.mutate.user_counters.update({
        userId: z.userID,
        value: currentValue - 1,
      });
    } else {
      await z.mutate.user_counters.insert({
        userId: z.userID,
        value: -1,
      });
    }
  };

  if (!counter || quarters.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartSeries = {
    labels: quarters.map((q) => q.quarter),
    values: quarters.map((q) => q.value),
  };

  const [primaryChart, ...remainingCharts] = chartMetaList;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-3">
              <Link to="/" className="link link-primary flex items-center gap-2 w-max">
                <span className="text-xl">←</span> Back to Home
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold">Counter & Quarterly Charts</h1>
            </div>
            <ThemeSwitcher />
          </header>

          <section className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col items-center pt-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <CardTitle className="text-center">Global Counter</CardTitle>
                  <LatencyBadge ms={counterLatencyMs} source="Zero: counter.current" />
                </div>
                <p className="text-sm text-muted-foreground mb-4 text-center">Synced across all users</p>
                <div className="flex items-center justify-center gap-0 w-full max-w-xs">
                  <Button onClick={handleDecrement} size="icon" className="text-2xl h-16 w-16 rounded-r-none flex-shrink-0">
                    −
                  </Button>
                  <div className="w-32 h-16 text-center text-3xl font-semibold bg-muted flex items-center justify-center border-y flex-shrink-0">
                    {counter.value}
                  </div>
                  <Button onClick={handleIncrement} size="icon" className="text-2xl h-16 w-16 rounded-l-none flex-shrink-0">
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center pt-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <CardTitle className="text-center">Your Counter</CardTitle>
                  <LatencyBadge ms={userCounterLatencyMs} source="Zero: user_counter.current" />
                </div>
                <p className="text-sm text-muted-foreground mb-4 text-center">Private to you only</p>
                <div className="flex items-center justify-center gap-0 w-full max-w-xs">
                  <Button
                    onClick={handleUserDecrement}
                    variant="secondary"
                    size="icon"
                    className="text-2xl h-16 w-16 rounded-r-none flex-shrink-0"
                  >
                    −
                  </Button>
                  <div className="w-32 h-16 text-center text-3xl font-semibold bg-muted flex items-center justify-center border-y flex-shrink-0">
                    {privateCounterValue}
                  </div>
                  <Button
                    onClick={handleUserIncrement}
                    variant="secondary"
                    size="icon"
                    className="text-2xl h-16 w-16 rounded-l-none flex-shrink-0"
                  >
                    +
                  </Button>
                </div>
                {!isLoggedIn ? (
                  <div className="mt-4 text-center text-sm">
                    <p className="mb-2 text-muted-foreground">
                      This value stays local and resets when you leave. Sign in to sync it.
                    </p>
                    <Button size="sm" onClick={handleLogin}>
                      Login
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    This value is stored privately for {z.userID}.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>{primaryChart.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{primaryChart.description}</p>
                <CardAction>
                  <LatencyBadge ms={quartersLatencyMs} source="Zero: quarters.series" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <QuarterChart
                    kind={primaryChart.key}
                    title={primaryChart.title}
                    labels={chartSeries.labels}
                    values={chartSeries.values}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {remainingCharts.map((meta) => (
              <Card key={meta.key}>
                <CardHeader>
                  <CardTitle className="text-base">{meta.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                  <CardAction>
                    <LatencyBadge ms={quartersLatencyMs} source="Zero: quarters.series" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden">
                    <QuarterChart
                      kind={meta.key}
                      title={meta.title}
                      labels={chartSeries.labels}
                      values={chartSeries.values}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
