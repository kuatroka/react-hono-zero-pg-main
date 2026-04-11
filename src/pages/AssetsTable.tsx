import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useZero } from '@rocicorp/zero/react';
import { useNavigate } from 'react-router-dom';
import { LatencyBadge } from '@/components/LatencyBadge';
import { ZeroVirtualDataTable, type ColumnDef } from '@/components/ZeroVirtualDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PerfTelemetry } from '@/lib/perf/telemetry';
import { Asset, Schema } from '@/schema';
import {
  queries,
  type AssetVirtualListContext,
  type AssetVirtualSortColumn,
  type AssetVirtualStartRow,
} from '@/zero/queries';
import { preload, PRELOAD_TTL } from '@/zero-preload';
import { preloadAssetDetail } from '@/lib/preload-asset-detail';

export function AssetsTablePage({ onReady }: { onReady: () => void }) {
  const z = useZero<Schema>();
  const navigate = useNavigate();
  const rowSelectedRef = useRef(false);
  const [tableTelemetry, setTableTelemetry] = useState<PerfTelemetry | null>(null);
  const [searchTelemetry, setSearchTelemetry] = useState<PerfTelemetry | null>(null);

  useEffect(() => {
    preload(z);
  }, [z]);

  // Helper to build asset detail URL with cusip
  const getAssetUrl = useCallback((row: Asset) => {
    const cusip = row.cusip || '_';
    return `/assets/${encodeURIComponent(row.asset)}/${encodeURIComponent(cusip)}`;
  }, []);

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      key: 'asset',
      header: 'Asset',
      sortable: true,
      searchable: true,
      clickable: true,
      render: (value, row, isFocused) => {
        const url = getAssetUrl(row);
        return (
          <a
            href={url}
            onMouseEnter={() => {
              preloadAssetDetail(z, {
                ticker: row.asset,
                cusip: row.cusip ?? null,
              });
            }}
            onClick={(e) => {
              e.preventDefault();
              rowSelectedRef.current = true;
              preloadAssetDetail(z, {
                ticker: row.asset,
                cusip: row.cusip ?? null,
              });
              navigate(url);
            }}
            className={`hover:underline underline-offset-4 cursor-pointer text-foreground outline-none ${isFocused ? 'underline' : ''}`}
          >
            {String(value)}
          </a>
        );
      },
    },
    {
      key: 'assetName',
      header: 'Asset Name',
      sortable: true,
      searchable: true,
    },
  ], [getAssetUrl, navigate, z]);

  const getPageQuery = useCallback((
    { dir, limit, settled, start }: {
      dir: 'forward' | 'backward';
      limit: number;
      settled: boolean;
      start: AssetVirtualStartRow | null;
    },
    listContextParams: AssetVirtualListContext,
  ) => {
    const ttl = settled ? ('5m' as const) : PRELOAD_TTL;
    return {
      query: queries.assetsVirtualPage(limit, start, dir, listContextParams),
      options: { ttl },
    };
  }, []);

  const getSingleQuery = useCallback(({ id, settled }: { id: string; settled: boolean }) => {
    const ttl = settled ? ('5m' as const) : PRELOAD_TTL;
    return {
      query: queries.assetsVirtualRowById(id),
      options: { ttl },
    };
  }, []);

  const toStartRow = useCallback((row: Asset): AssetVirtualStartRow => ({
    id: row.id,
    asset: row.asset,
    assetName: row.assetName,
    cusip: row.cusip,
  }), []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="text-3xl font-bold tracking-tight">Assets</CardTitle>
          <div className="flex flex-col items-end gap-2">
            {tableTelemetry ? <LatencyBadge telemetry={tableTelemetry} className="min-w-[11rem] justify-end" /> : null}
            {searchTelemetry ? <LatencyBadge telemetry={searchTelemetry} className="min-w-[11rem] justify-end" /> : null}
          </div>
        </CardHeader>
        <CardContent>
          <ZeroVirtualDataTable<Asset, AssetVirtualStartRow, AssetVirtualSortColumn>
            columns={columns}
            defaultSortColumn="assetName"
            defaultSortDirection="asc"
            getPageQuery={getPageQuery}
            getSingleQuery={getSingleQuery}
            getRowKey={(row) => row.id}
            gridTemplateColumns="minmax(12rem, 1fr) minmax(20rem, 1.5fr)"
            historyKey="assetsTableScrollState"
            latencySource="zero-client"
            onReady={onReady}
            onSearchTelemetryChange={setSearchTelemetry}
            onTableTelemetryChange={setTableTelemetry}
            searchDebounceMs={150}
            searchPlaceholder="Search assets..."
            searchTelemetryLabel="search"
            tableTelemetryLabel="virtual table"
            toStartRow={toStartRow}
          />
        </CardContent>
      </Card>
    </div>
  );
}
