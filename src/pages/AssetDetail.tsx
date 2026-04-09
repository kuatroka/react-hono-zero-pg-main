import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@rocicorp/zero/react';
import { LatencyBadge } from '@/components/LatencyBadge';
import { InvestorActivityDrilldownTable } from '@/components/InvestorActivityDrilldownTable';
import { resolveDefaultInvestorActivitySelection } from '@/lib/investor-activity-selection';
import { useLatencyMs } from '@/lib/latency';
import { createLegacyPerfTelemetry, createPerfTelemetry } from '@/lib/perf/telemetry';
import { queries } from '@/zero/queries';
import { PRELOAD_TTL } from '@/zero-preload';
import { InvestorActivityEchartsChart } from '@/components/charts/InvestorActivityEchartsChart';
import type { CusipQuarterInvestorActivity } from '@/schema';

const AssetDetailHeader = memo(function AssetDetailHeader({
  asset,
  assetName,
  telemetry,
}: {
  asset: string;
  assetName: string | null;
  telemetry: ReturnType<typeof createLegacyPerfTelemetry>;
}) {
  return (
    <div className="grid w-full grid-cols-3 items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="text-left">
        <Link
          to="/assets"
          className="whitespace-nowrap text-primary hover:underline"
        >
          &larr; Back to assets
        </Link>
      </div>
      <div className="text-center">
        <h1 className="overflow-hidden text-ellipsis whitespace-nowrap text-3xl font-bold">
          ({asset}) {assetName}
        </h1>
      </div>
      <div className="flex justify-end">
        <LatencyBadge telemetry={telemetry} />
      </div>
    </div>
  );
});

const AssetDetailActivityGrid = memo(function AssetDetailActivityGrid({
  asset,
  cusip,
  activityRows,
}: {
  asset: string;
  cusip: string | null;
  activityRows: readonly CusipQuarterInvestorActivity[];
}) {
  const [echartsRenderLatencyMs, setEchartsRenderLatencyMs] = useState<number | null>(null);
  const [selectedInvestorActivity, setSelectedInvestorActivity] = useState<{
    quarter: string;
    action: 'open' | 'close';
  } | null>(null);
  const activityDataLatencyMs = useLatencyMs({
    isReady: activityRows.length > 0,
    resetKey: `${asset}:${cusip ?? 'no-cusip'}:${activityRows.length}`,
  });
  const echartsTelemetry = useMemo(() => createPerfTelemetry({
    label: 'investorActivity: data',
    ms: activityDataLatencyMs,
    secondaryLabel: 'investorActivity: ECharts render',
    secondaryMs: echartsRenderLatencyMs,
    source: 'zero-client',
  }), [activityDataLatencyMs, echartsRenderLatencyMs]);
  const defaultInvestorActivitySelection = resolveDefaultInvestorActivitySelection(activityRows);
  const resolvedInvestorActivitySelection = selectedInvestorActivity ?? defaultInvestorActivitySelection;
  const handleInvestorActivityBarClick = useCallback((selection: { quarter: string; action: 'open' | 'close' }) => {
    setSelectedInvestorActivity((currentSelection) => (
      currentSelection?.quarter === selection.quarter && currentSelection.action === selection.action
        ? currentSelection
        : selection
    ));
  }, []);

  useEffect(() => {
    setEchartsRenderLatencyMs(null);
  }, [activityRows.length, asset, cusip]);

  useEffect(() => {
    setSelectedInvestorActivity(null);
  }, [asset, cusip]);

  return (
    <div className="mt-8 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)] xl:items-start">
        <InvestorActivityEchartsChart
          data={activityRows}
          ticker={asset}
          telemetry={echartsTelemetry}
          onRenderReady={setEchartsRenderLatencyMs}
          onBarClick={handleInvestorActivityBarClick}
        />
        <div className="min-w-0">
          {resolvedInvestorActivitySelection ? (
            <InvestorActivityDrilldownTable
              ticker={asset}
              cusip={cusip}
              selection={resolvedInvestorActivitySelection}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-muted-foreground">
              No investor drilldown data available for this asset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export function AssetDetailPage({ onReady }: { onReady: () => void }) {
  const { code, cusip } = useParams();

  // Determine if we have a valid cusip (not "_" placeholder)
  const hasCusip = cusip && cusip !== "_";

  // Query asset: prefer by symbol+cusip if cusip is available, otherwise by symbol only
  const [rowsBySymbolAndCusip, resultBySymbolAndCusip] = useQuery(
    queries.assetBySymbolAndCusip(code || '', cusip || ''),
    { enabled: Boolean(code) && Boolean(hasCusip), ttl: PRELOAD_TTL }
  );

  const [rowsBySymbol, resultBySymbol] = useQuery(
    queries.assetBySymbol(code || ''),
    { enabled: Boolean(code) && !hasCusip, ttl: PRELOAD_TTL }
  );

  // Use the appropriate result based on whether we have a cusip
  const rows = hasCusip ? rowsBySymbolAndCusip : rowsBySymbol;
  const result = hasCusip ? resultBySymbolAndCusip : resultBySymbol;
  const record = rows?.[0];

  const assetReady = Boolean(record || result.type === 'complete');
  const assetLatencyMs = useLatencyMs({
    isReady: assetReady,
    resetKey: hasCusip ? `asset:${code ?? ''}:${cusip ?? ''}` : `asset:${code ?? ''}`,
  });
  const assetSource = hasCusip ? 'Zero: assets.bySymbolAndCusip' : 'Zero: assets.bySymbol';

  // Query investor activity: prefer by cusip if available, otherwise by ticker
  const [activityByCusip] = useQuery(
    queries.investorActivityByCusip(cusip || ''),
    { enabled: Boolean(hasCusip), ttl: PRELOAD_TTL }
  );

  const [activityByTicker] = useQuery(
    queries.investorActivityByTicker(code || ''),
    { enabled: Boolean(code) && !hasCusip, ttl: PRELOAD_TTL }
  );

  const activityRows = useMemo(
    () => (hasCusip ? (activityByCusip ?? []) : (activityByTicker ?? [])),
    [activityByCusip, activityByTicker, hasCusip],
  );
  const assetTelemetry = useMemo(() => createLegacyPerfTelemetry({
    label: 'data',
    ms: assetLatencyMs,
    source: assetSource,
  }), [assetLatencyMs, assetSource]);

  // Signal ready when data is available (from cache or server)
  useEffect(() => {
    if (record || result.type === 'complete') {
      onReady();
    }
  }, [record, result.type, onReady]);

  if (!code) return <div className="p-6">Missing asset code.</div>;

  if (record) {
    // We have data, render it immediately (even if still syncing)
  } else if (result.type === 'unknown') {
    // Still loading and no cached data yet
    return <div className="p-6">Loading…</div>;
  } else {
    // Query completed but no record found
    return <div className="p-6">Asset not found.</div>;
  }

  return (
    <>
      <AssetDetailHeader
        asset={record.asset}
        assetName={record.assetName}
        telemetry={assetTelemetry}
      />
      <AssetDetailActivityGrid
        asset={record.asset}
        cusip={record.cusip ?? null}
        activityRows={activityRows}
      />
    </>
  );
}
