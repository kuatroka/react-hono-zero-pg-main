import { buildInvestorActivityDrilldownAssetKey } from "../src/lib/investor-activity-drilldown";
import {
  resolveDefaultInvestorActivitySelection,
  type InvestorActivitySelection,
} from "../src/lib/investor-activity-selection";
import { resolveDrilldownIdRanges } from "./investor-activity-drilldown-ranges";

type SqlClient = {
  <TRow>(strings: TemplateStringsArray, ...values: unknown[]): TRow | Promise<TRow>;
  begin: <T>(callback: (sql: SqlClient) => Promise<T>) => Promise<T>;
  unsafe: (query: string) => unknown;
};

type HydrateInvestorActivityDrilldownParams = Readonly<{
  ticker: string;
  cusip: string | null;
}>;

type AggregateRow = Readonly<{
  quarter: string;
  numOpen: number | null;
  numClose: number | null;
}>;

type AggregateDrilldownRangeRow = AggregateRow & Readonly<{
  minDetailId: number;
  maxDetailId: number;
}>;

type ExistingHydrationRow = Readonly<{
  status: string;
  defaultQuarter: string | null;
  defaultAction: InvestorActivitySelection["action"] | null;
  rowCount: number | string | null;
}>;

async function loadAggregateRows(
  sql: SqlClient,
  ticker: string,
  cusip: string | null,
) {
  return await sql<AggregateRow[]>`
    SELECT
      quarter,
      num_open AS "numOpen",
      num_close AS "numClose"
    FROM serving.cusip_quarter_investor_activity
    WHERE (
      (${cusip}::text IS NOT NULL AND cusip = ${cusip})
      OR (${cusip}::text IS NULL AND ticker = ${ticker})
    )
    ORDER BY quarter ASC
  `;
}

export type HydrateInvestorActivityDrilldownResult = Readonly<{
  assetKey: string;
  defaultSelection: InvestorActivitySelection | null;
}>;

export async function hydrateInvestorActivityDrilldown(
  sql: SqlClient,
  { ticker, cusip }: HydrateInvestorActivityDrilldownParams,
): Promise<HydrateInvestorActivityDrilldownResult> {
  const assetKey = buildInvestorActivityDrilldownAssetKey(ticker, cusip);

  const [existingHydration] = await sql<ExistingHydrationRow[]>`
    SELECT
      status,
      default_quarter AS "defaultQuarter",
      default_action AS "defaultAction",
      row_count AS "rowCount"
    FROM serving.asset_investor_activity_drilldown_hydration
    WHERE asset_key = ${assetKey}
    LIMIT 1
  `;

  const existingRowCount = Number(existingHydration?.rowCount ?? 0);
  let prefetchedAggregateRows: AggregateRow[] | null = null;

  if (existingHydration?.status === "ready" && existingRowCount > 0) {
    return {
      assetKey,
      defaultSelection: existingHydration.defaultQuarter && existingHydration.defaultAction
        ? {
            quarter: existingHydration.defaultQuarter,
            action: existingHydration.defaultAction,
          }
        : null,
    };
  }

  if (existingHydration?.status === "ready" && existingRowCount === 0) {
    prefetchedAggregateRows = await loadAggregateRows(sql, ticker, cusip);
    const defaultSelection = resolveDefaultInvestorActivitySelection(prefetchedAggregateRows);
    if (!defaultSelection) {
      return {
        assetKey,
        defaultSelection: null,
      };
    }
  }

  try {
    return await sql.begin(async (tx) => {
      await tx`
        INSERT INTO serving.asset_investor_activity_drilldown_hydration (
          asset_key,
          ticker,
          cusip,
          status,
          default_quarter,
          default_action,
          row_count,
          hydrated_at,
          error_message
        )
        VALUES (
          ${assetKey},
          ${ticker},
          ${cusip},
          'pending',
          NULL,
          NULL,
          0,
          NULL,
          NULL
        )
        ON CONFLICT (asset_key) DO UPDATE
        SET
          ticker = EXCLUDED.ticker,
          cusip = EXCLUDED.cusip,
          status = 'pending',
          default_quarter = NULL,
          default_action = NULL,
          row_count = 0,
          hydrated_at = NULL,
          error_message = NULL
      `;

      const aggregateRows = prefetchedAggregateRows ?? await loadAggregateRows(tx, ticker, cusip);
      const defaultSelection = resolveDefaultInvestorActivitySelection(aggregateRows);
      const rangeRows: AggregateDrilldownRangeRow[] = [];
      let useLegacyDetailQuery = false;

      for (const row of aggregateRows) {
        const resolved = await resolveDrilldownIdRanges(tx, {
          ticker,
          quarter: row.quarter,
          cusip,
        });

        if (resolved.useLegacyDetailQuery) {
          useLegacyDetailQuery = true;
          break;
        }

        for (const range of resolved.ranges) {
          rangeRows.push({
            ...row,
            minDetailId: range.minDetailId,
            maxDetailId: range.maxDetailId,
          });
        }
      }

      await tx`
        DELETE FROM serving.asset_investor_activity_drilldown_zero
        WHERE asset_key = ${assetKey}
      `;

      const rowCountRows = useLegacyDetailQuery
        ? await tx<ReadonlyArray<{ rowCount: number | string }>>`
            WITH source_rows AS (
              SELECT
                CONCAT(d.id::text, ':open') AS id,
                ${assetKey}::text AS asset_key,
                COALESCE(d.ticker, ${ticker})::text AS ticker,
                d.cusip::text AS cusip,
                d.quarter::text AS quarter,
                'open'::text AS action,
                COALESCE(s.cik_name, d.cik::text) AS cik_name,
                d.cik::text AS cik,
                COALESCE(s.cik_ticker, '') AS cik_ticker,
                d.id AS detail_id,
                NOW() AS hydrated_at
              FROM serving.cusip_quarter_investor_activity_detail d
              LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
              WHERE (
                (${cusip}::text IS NOT NULL AND d.cusip = ${cusip})
                OR (${cusip}::text IS NULL AND d.ticker = ${ticker})
              )
                AND d.did_open = true

              UNION ALL

              SELECT
                CONCAT(d.id::text, ':close') AS id,
                ${assetKey}::text AS asset_key,
                COALESCE(d.ticker, ${ticker})::text AS ticker,
                d.cusip::text AS cusip,
                d.quarter::text AS quarter,
                'close'::text AS action,
                COALESCE(s.cik_name, d.cik::text) AS cik_name,
                d.cik::text AS cik,
                COALESCE(s.cik_ticker, '') AS cik_ticker,
                d.id AS detail_id,
                NOW() AS hydrated_at
              FROM serving.cusip_quarter_investor_activity_detail d
              LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
              WHERE (
                (${cusip}::text IS NOT NULL AND d.cusip = ${cusip})
                OR (${cusip}::text IS NULL AND d.ticker = ${ticker})
              )
                AND d.did_close = true
            ),
            inserted AS (
              INSERT INTO serving.asset_investor_activity_drilldown_zero (
                id,
                asset_key,
                ticker,
                cusip,
                quarter,
                action,
                cik_name,
                cik,
                cik_ticker,
                detail_id,
                hydrated_at
              )
              SELECT
                id,
                asset_key,
                ticker,
                cusip,
                quarter,
                action,
                cik_name,
                cik,
                cik_ticker,
                detail_id,
                hydrated_at
              FROM source_rows
              ORDER BY quarter DESC, action ASC, cik_name ASC, cik ASC, detail_id ASC
              RETURNING 1
            )
            SELECT COUNT(*)::bigint AS "rowCount" FROM inserted
          `
        : rangeRows.length === 0
          ? [{ rowCount: 0 }]
          : await tx<ReadonlyArray<{ rowCount: number | string }>>`
              WITH selected_ranges(quarter, min_detail_id, max_detail_id) AS (
                VALUES ${tx.unsafe(rangeRows.map((row) => (
                  `('${row.quarter.replaceAll("'", "''")}', ${row.minDetailId}, ${row.maxDetailId})`
                )).join(", "))}
              ),
              source_rows AS (
                SELECT
                  CONCAT(d.id::text, ':open') AS id,
                  ${assetKey}::text AS asset_key,
                  COALESCE(d.ticker, ${ticker})::text AS ticker,
                  d.cusip::text AS cusip,
                  d.quarter::text AS quarter,
                  'open'::text AS action,
                  COALESCE(s.cik_name, d.cik::text) AS cik_name,
                  d.cik::text AS cik,
                  COALESCE(s.cik_ticker, '') AS cik_ticker,
                  d.id AS detail_id,
                  NOW() AS hydrated_at
                FROM selected_ranges r
                JOIN serving.cusip_quarter_investor_activity_detail d
                  ON d.id BETWEEN r.min_detail_id AND r.max_detail_id
                 AND d.quarter = r.quarter
                LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
                WHERE d.did_open = true

                UNION ALL

                SELECT
                  CONCAT(d.id::text, ':close') AS id,
                  ${assetKey}::text AS asset_key,
                  COALESCE(d.ticker, ${ticker})::text AS ticker,
                  d.cusip::text AS cusip,
                  d.quarter::text AS quarter,
                  'close'::text AS action,
                  COALESCE(s.cik_name, d.cik::text) AS cik_name,
                  d.cik::text AS cik,
                  COALESCE(s.cik_ticker, '') AS cik_ticker,
                  d.id AS detail_id,
                  NOW() AS hydrated_at
                FROM selected_ranges r
                JOIN serving.cusip_quarter_investor_activity_detail d
                  ON d.id BETWEEN r.min_detail_id AND r.max_detail_id
                 AND d.quarter = r.quarter
                LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
                WHERE d.did_close = true
              ),
              inserted AS (
                INSERT INTO serving.asset_investor_activity_drilldown_zero (
                  id,
                  asset_key,
                  ticker,
                  cusip,
                  quarter,
                  action,
                  cik_name,
                  cik,
                  cik_ticker,
                  detail_id,
                  hydrated_at
                )
                SELECT
                  id,
                  asset_key,
                  ticker,
                  cusip,
                  quarter,
                  action,
                  cik_name,
                  cik,
                  cik_ticker,
                  detail_id,
                  hydrated_at
                FROM source_rows
                ORDER BY quarter DESC, action ASC, cik_name ASC, cik ASC, detail_id ASC
                RETURNING 1
              )
              SELECT COUNT(*)::bigint AS "rowCount" FROM inserted
            `;
      const [rowCountRow] = rowCountRows;

      await tx`
        UPDATE serving.asset_investor_activity_drilldown_hydration
        SET
          status = 'ready',
          default_quarter = ${defaultSelection?.quarter ?? null},
          default_action = ${defaultSelection?.action ?? null},
          row_count = ${Number(rowCountRow?.rowCount ?? 0)},
          hydrated_at = NOW(),
          error_message = NULL
        WHERE asset_key = ${assetKey}
      `;

      return {
        assetKey,
        defaultSelection,
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    try {
      await sql`
        INSERT INTO serving.asset_investor_activity_drilldown_hydration (
          asset_key,
          ticker,
          cusip,
          status,
          default_quarter,
          default_action,
          row_count,
          hydrated_at,
          error_message
        )
        VALUES (
          ${assetKey},
          ${ticker},
          ${cusip},
          'error',
          NULL,
          NULL,
          0,
          NOW(),
          ${errorMessage}
        )
        ON CONFLICT (asset_key) DO UPDATE
        SET
          ticker = EXCLUDED.ticker,
          cusip = EXCLUDED.cusip,
          status = 'error',
          default_quarter = NULL,
          default_action = NULL,
          row_count = 0,
          hydrated_at = NOW(),
          error_message = ${errorMessage}
      `;
    } catch {
      // ignore follow-up status failures and surface the original error
    }

    throw error;
  }
}
