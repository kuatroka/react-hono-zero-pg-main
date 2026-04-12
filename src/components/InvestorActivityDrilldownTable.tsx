"use client";

import { useMemo } from "react";
import { useQuery } from "@rocicorp/zero/react";
import { Link } from "react-router-dom";
import { LocalVirtualDataTable, type LocalVirtualColumnDef } from "@/components/LocalVirtualDataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LatencyBadge } from "@/components/LatencyBadge";
import { useLatencyMs } from "@/lib/latency";
import { createLegacyPerfTelemetry } from "@/lib/perf/telemetry";
import type { InvestorActivitySelection } from "@/lib/investor-activity-selection";
import type { CusipQuarterInvestorActivityDetail, Superinvestor } from "@/schema";
import { PRELOAD_TTL } from "@/zero-preload";
import { queries } from "@/zero/queries";

const CIK_CHUNK_SIZE = 400;
const MAX_CIK_CHUNKS = 5; // supports up to 2000 CIKs

function useChunkedSuperinvestorsByCiks(ciks: string[]) {
  const chunks = useMemo(() => {
    if (ciks.length === 0) return [[]];
    const result: string[][] = [];
    for (let i = 0; i < ciks.length; i += CIK_CHUNK_SIZE) {
      result.push(ciks.slice(i, i + CIK_CHUNK_SIZE));
    }
    return result.slice(0, MAX_CIK_CHUNKS);
  }, [ciks]);

  // Pad to fixed length so useQuery calls are always the same count
  const padded = useMemo(
    () => [...chunks, ...Array(Math.max(0, MAX_CIK_CHUNKS - chunks.length)).fill([] as string[])],
    [chunks],
  );

  const [r0, q0] = useQuery(queries.superinvestorsByCiks(padded[0]), { ttl: PRELOAD_TTL });
  const [r1, q1] = useQuery(queries.superinvestorsByCiks(padded[1]), { ttl: PRELOAD_TTL });
  const [r2, q2] = useQuery(queries.superinvestorsByCiks(padded[2]), { ttl: PRELOAD_TTL });
  const [r3, q3] = useQuery(queries.superinvestorsByCiks(padded[3]), { ttl: PRELOAD_TTL });
  const [r4, q4] = useQuery(queries.superinvestorsByCiks(padded[4]), { ttl: PRELOAD_TTL });

  const allRows = useMemo(
    () => [r0, r1, r2, r3, r4].flat() as Superinvestor[],
    [r0, r1, r2, r3, r4],
  );

  const allComplete = useMemo(() => {
    const queryResults = [q0, q1, q2, q3, q4];
    return queryResults.every((q) => q.type === "complete");
  }, [q0, q1, q2, q3, q4]);

  const lookup = useMemo(
    () => new Map(allRows.map((row) => [row.cik, row] as const)),
    [allRows],
  );

  return { lookup, isComplete: allComplete } as const;
}

interface InvestorActivityDrilldownTableProps {
  ticker: string;
  cusip: string | null;
  selection: InvestorActivitySelection;
  detailRange?: Readonly<{
    minDetailId: number;
    maxDetailId: number;
  }> | null;
}

type InvestorActivityDrilldownRow = {
  id: number;
  cik: string;
  cikName: string;
  cikTicker: string;
  quarter: string;
  action: InvestorActivitySelection["action"];
};

export function InvestorActivityDrilldownTable({
  ticker,
  cusip,
  selection,
  detailRange = null,
}: InvestorActivityDrilldownTableProps) {
  const [detailRows, detailResult] = useQuery(
    detailRange
      ? queries.investorActivityDrilldownByDetailRange(
        detailRange.minDetailId,
        detailRange.maxDetailId,
        selection.action,
      )
      : cusip
        ? queries.investorActivityDrilldownByCusip(cusip, selection.quarter, selection.action)
        : queries.investorActivityDrilldownByTicker(ticker, selection.quarter, selection.action),
    { ttl: PRELOAD_TTL },
  );
  const ciks = useMemo(
    () =>
      Array.from(
        new Set(
          (detailRows as CusipQuarterInvestorActivityDetail[])
            .map((row) => row.cik)
            .filter((value): value is number => typeof value === "number")
            .map(String),
        ),
      ),
    [detailRows],
  );
  const { lookup: superinvestorsByCik, isComplete: superinvestorLookupComplete } = useChunkedSuperinvestorsByCiks(ciks);

  const titleAction = selection.action === "open" ? "opened" : "closed";
  const title = `Superinvestors who ${titleAction} positions in ${ticker} (${selection.quarter})`;

  const rows = useMemo<InvestorActivityDrilldownRow[]>(
    () =>
      (detailRows as CusipQuarterInvestorActivityDetail[])
        .map((row) => {
          const cik = row.cik == null ? "" : String(row.cik);
          const superinvestor = superinvestorsByCik.get(cik);
          return {
            id: row.id,
            cik,
            cikName: superinvestor?.cikName || cik || "Unknown superinvestor",
            cikTicker: superinvestor?.cikTicker || "—",
            quarter: row.quarter || selection.quarter,
            action: selection.action,
          };
        })
        .sort((left, right) =>
          left.cikName.localeCompare(right.cikName)
          || left.cik.localeCompare(right.cik)
          || left.id - right.id,
        ),
    [detailRows, selection.action, selection.quarter, superinvestorsByCik],
  );

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
      searchable: true,
    },
    {
      key: "cikTicker",
      header: "Ticker",
      searchable: true,
    },
    {
      key: "quarter",
      header: "Quarter",
      searchable: true,
    },
    {
      key: "action",
      header: "Action",
      searchable: true,
    },
  ], []);
  const isLoading = rows.length === 0 && detailResult.type === "unknown";
  const isReady = detailResult.type === "complete"
    && (ciks.length === 0 || superinvestorLookupComplete);
  const latencyMs = useLatencyMs({
    isReady,
    resetKey: `${ticker}:${cusip ?? ""}:${selection.quarter}:${selection.action}:${detailRange?.minDetailId ?? 0}:${detailRange?.maxDetailId ?? 0}`,
  });
  const tableTelemetry = useMemo(
    () => latencyMs == null
      ? null
      : createLegacyPerfTelemetry({
        label: "drilldown data",
        ms: latencyMs,
        source: "zero-client",
      }),
    [latencyMs],
  );

  return (
    <Card className="min-w-0 h-[450px] overflow-hidden" style={{ gap: 0, paddingTop: 0, paddingBottom: 0 }}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-6 pt-6 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription>
            Search and sort the investors linked to the selected bar.
          </CardDescription>
        </div>
        {tableTelemetry ? <LatencyBadge telemetry={tableTelemetry} /> : null}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-6 pb-6">
        <LocalVirtualDataTable<InvestorActivityDrilldownRow, "cikName">
          columns={columns}
          data={rows}
          defaultSortColumn="cikName"
          defaultSortDirection="asc"
          emptyStateLabel={isLoading ? "Loading drilldown…" : "No superinvestors found for this selection."}
          getRowKey={(row) => row.id}
          gridTemplateColumns="minmax(18rem, 1.8fr) minmax(8rem, 0.9fr) minmax(8rem, 0.8fr) minmax(7rem, 0.8fr) minmax(6rem, 0.6fr)"
          historyKey={`investor-drilldown:${ticker}:${cusip ?? "ticker"}:${selection.quarter}:${selection.action}`}
          searchPlaceholder="Search superinvestors..."
          visibleRowCount={6}
        />
      </CardContent>
    </Card>
  );
}
