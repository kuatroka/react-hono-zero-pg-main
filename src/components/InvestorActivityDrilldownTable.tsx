"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LatencyBadge } from "@/components/LatencyBadge";
import { LocalVirtualDataTable, type LocalVirtualColumnDef } from "@/components/LocalVirtualDataTable";
import { createLegacyPerfTelemetry } from "@/lib/perf/telemetry";
import type { InvestorActivitySelection } from "@/lib/investor-activity-selection";

type InvestorActivityDrilldownRow = Readonly<{
  id: number;
  cik: string;
  cikName: string;
  cikTicker: string;
  quarter: string;
  action: "open" | "close";
}>;

type InvestorActivityDrilldownApiRow = Readonly<{
  id: number;
  cik: string;
  cikName: string | null;
  cikTicker: string | null;
  quarter: string;
  action: "open" | "close";
}>;

interface InvestorActivityDrilldownTableProps {
  ticker: string;
  cusip: string | null;
  selection: InvestorActivitySelection;
}

export function InvestorActivityDrilldownTable({
  ticker,
  cusip,
  selection,
}: InvestorActivityDrilldownTableProps) {
  const [cachedRowsBySelection, setCachedRowsBySelection] = useState<Record<string, readonly InvestorActivityDrilldownApiRow[]>>({});
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [rowsRenderMs, setRowsRenderMs] = useState<number | null>(null);
  const renderStartRef = useRef<number | null>(null);
  const selectionKey = `${ticker}:${cusip ?? "no-cusip"}:${selection.quarter}:${selection.action}`;
  const detailRows = useMemo(
    () => cachedRowsBySelection[selectionKey] ?? [],
    [cachedRowsBySelection, selectionKey],
  );

  useEffect(() => {
    if (!ticker || !selection.quarter) {
      setCachedRowsBySelection({});
      setQueryTimeMs(null);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    const controller = new AbortController();
    const startedAt = performance.now();
    const params = new URLSearchParams({
      ticker,
      quarter: selection.quarter,
      action: selection.action,
    });

    if (cusip) {
      params.set("cusip", cusip);
    }

    setIsLoading(true);
    setIsError(false);
    setQueryTimeMs(null);
    setRowsRenderMs(null);

    void (async () => {
      try {
        const response = await fetch(`/api/investor-activity-drilldown?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Drilldown request failed: ${response.status}`);
        }

        const payload = await response.json() as { rows?: InvestorActivityDrilldownApiRow[] };
        if (controller.signal.aborted) {
          return;
        }

        setCachedRowsBySelection((current) => ({
          ...current,
          [selectionKey]: payload.rows ?? [],
        }));
        setQueryTimeMs(Math.round(performance.now() - startedAt));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[InvestorActivityDrilldownTable] Failed to load drilldown rows", error);
        setIsError(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [cusip, selection.action, selection.quarter, selectionKey, ticker]);

  const rows = useMemo<InvestorActivityDrilldownRow[]>(() => {
    return detailRows.map((row) => ({
      id: row.id,
      cik: row.cik,
      cikName: row.cikName ?? `CIK ${row.cik}`,
      cikTicker: row.cikTicker ?? "",
      quarter: row.quarter,
      action: row.action,
    }));
  }, [detailRows]);

  useEffect(() => {
    if (rows.length === 0) {
      renderStartRef.current = null;
      return;
    }

    renderStartRef.current = performance.now();
  }, [rows.length, selection.action, selection.quarter, ticker, cusip]);

  useEffect(() => {
    if (renderStartRef.current == null || rows.length === 0) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      if (renderStartRef.current == null) {
        return;
      }

      setRowsRenderMs(Math.round(performance.now() - renderStartRef.current));
      renderStartRef.current = null;
    });

    return () => cancelAnimationFrame(rafId);
  }, [rows.length, selection.action, selection.quarter, ticker, cusip]);

  const telemetry = useMemo(() => createLegacyPerfTelemetry({
    label: "drilldown data",
    ms: queryTimeMs,
    renderMs: rowsRenderMs,
    source: "api:pg",
  }), [queryTimeMs, rowsRenderMs]);

  const titleAction = selection.action === "open" ? "opened" : "closed";
  const title = `Superinvestors who ${titleAction} positions in ${ticker} (${selection.quarter})`;

  const columns = useMemo<LocalVirtualColumnDef<InvestorActivityDrilldownRow>[]>(() => [
    {
      key: "cikName",
      header: "Superinvestor",
      sortable: true,
      searchable: true,
      clickable: true,
      render: (value, row, isFocused) => (
        <Link
          to={`/superinvestors/${encodeURIComponent(row.cik)}`}
          className={`hover:underline underline-offset-4 cursor-pointer text-foreground outline-none ${isFocused ? "underline" : ""}`}
        >
          {String(value)}
        </Link>
      ),
    },
    {
      key: "cik",
      header: "CIK",
      sortable: true,
      searchable: true,
    },
    {
      key: "cikTicker",
      header: "Ticker",
      sortable: true,
      searchable: true,
    },
    {
      key: "quarter",
      header: "Quarter",
      sortable: true,
      searchable: true,
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      searchable: true,
    },
  ], []);

  return (
    <Card className="min-w-0 h-[450px] overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription>
            Search and sort the investors linked to the selected bar.
          </CardDescription>
        </div>
        <LatencyBadge telemetry={telemetry} />
      </CardHeader>
      <CardContent className="h-[calc(100%-88px)] min-h-0">
        {isError ? (
          <div className="rounded-lg border border-destructive/20 bg-background px-4 py-8 text-center text-destructive">
            Failed to load drilldown data.
          </div>
        ) : isLoading && rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-4 py-8 text-center text-muted-foreground">
            Loading drilldown…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-4 py-8 text-center text-muted-foreground">
            No superinvestors found for this selection.
          </div>
        ) : (
          <LocalVirtualDataTable
            className="h-full"
            data={rows}
            columns={columns}
            defaultSortColumn="cikName"
            defaultSortDirection="asc"
            emptyStateLabel="No superinvestors found for this selection."
            getRowKey={(row) => row.id}
            gridTemplateColumns="minmax(18rem, 1.8fr) minmax(8rem, 0.9fr) minmax(8rem, 0.8fr) minmax(7rem, 0.8fr) minmax(6rem, 0.6fr)"
            historyKey={`investor-drilldown:${ticker}:${cusip ?? "no-cusip"}:${selection.quarter}:${selection.action}`}
            searchPlaceholder="Search superinvestors..."
            visibleRowCount={6}
          />
        )}
      </CardContent>
    </Card>
  );
}
