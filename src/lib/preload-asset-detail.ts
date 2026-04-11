import type { Zero } from "@rocicorp/zero";
import type { CusipQuarterInvestorActivity, Schema } from "@/schema";
import { PRELOAD_TTL } from "@/zero-preload";
import { queries } from "@/zero/queries";

type AssetDetailPreloadParams = Readonly<{
  ticker: string;
  cusip: string | null;
  activityRows?: readonly CusipQuarterInvestorActivity[];
}>;

function preloadDrilldownSelections(
  z: Zero<Schema>,
  activityRows: readonly CusipQuarterInvestorActivity[],
) {
  const seen = new Set<string>();

  for (const row of activityRows) {
    if (
      typeof row.minDetailId !== "number"
      || typeof row.maxDetailId !== "number"
    ) {
      continue;
    }

    if (row.numOpen > 0) {
      const key = `${row.quarter}:open`;
      if (!seen.has(key)) {
        seen.add(key);
        z.preload(
          queries.investorActivityDrilldownByDetailRange(row.minDetailId, row.maxDetailId, "open"),
          { ttl: PRELOAD_TTL },
        );
      }
    }

    if (row.numClose > 0) {
      const key = `${row.quarter}:close`;
      if (!seen.has(key)) {
        seen.add(key);
        z.preload(
          queries.investorActivityDrilldownByDetailRange(row.minDetailId, row.maxDetailId, "close"),
          { ttl: PRELOAD_TTL },
        );
      }
    }
  }
}

function preloadAssetCoreQueries(z: Zero<Schema>, { ticker, cusip }: AssetDetailPreloadParams) {
  if (cusip) {
    z.preload(queries.assetBySymbolAndCusip(ticker, cusip), { ttl: PRELOAD_TTL });
    z.preload(queries.investorActivityByCusip(cusip), { ttl: PRELOAD_TTL });
    return;
  }

  z.preload(queries.assetBySymbol(ticker), { ttl: PRELOAD_TTL });
  z.preload(queries.investorActivityByTicker(ticker), { ttl: PRELOAD_TTL });
}

export function preloadAssetDetail(z: Zero<Schema>, params: AssetDetailPreloadParams) {
  preloadAssetCoreQueries(z, params);

  if (params.activityRows?.length) {
    preloadDrilldownSelections(z, params.activityRows);
  }
}
