type DrilldownIdRange = {
  minDetailId: number;
  maxDetailId: number;
};

type DrilldownDetailKeyRow = {
  id: number | string;
  cusip: string | null;
  quarter: string | null;
};

type SqlTag = {
  <TRow>(strings: TemplateStringsArray, ...values: unknown[]): TRow | Promise<TRow>;
};

async function hasAggregateRangeColumns(sql: SqlTag) {
  const [row] = await sql<Array<{ hasColumns: boolean }>>`
    SELECT COUNT(*) = 2 AS "hasColumns"
    FROM information_schema.columns
    WHERE table_schema = 'serving'
      AND table_name = 'cusip_quarter_investor_activity'
      AND column_name IN ('min_detail_id', 'max_detail_id')
  `;

  return Boolean(row?.hasColumns);
}

function compareDetailSelection(
  row: Pick<DrilldownDetailKeyRow, "cusip" | "quarter">,
  target: { cusip: string; quarter: string },
) {
  const cusipComparison = (row.cusip ?? "").localeCompare(target.cusip);
  if (cusipComparison !== 0) {
    return cusipComparison;
  }

  return (row.quarter ?? "").localeCompare(target.quarter);
}

async function findDetailBoundaryByPrimaryKey(
  sql: SqlTag,
  direction: "first" | "last",
  target: { cusip: string; quarter: string },
  maxId: number,
) {
  let low = 1;
  let high = maxId;
  let foundId: number | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const [row] = await sql<DrilldownDetailKeyRow[]>`
      SELECT id, cusip, quarter
      FROM serving.cusip_quarter_investor_activity_detail
      WHERE id = ${mid}
    `;

    if (!row) {
      break;
    }

    const comparison = compareDetailSelection(row, target);
    if (comparison === 0) {
      foundId = Number(row.id);
      if (direction === "first") {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
      continue;
    }

    if (comparison < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return foundId;
}

export async function resolveDrilldownIdRanges(
  sql: SqlTag,
  {
    ticker,
    quarter,
    cusip,
  }: {
    ticker: string;
    quarter: string;
    cusip: string | null;
  },
) {
  type DrilldownIdRangeRow = {
    minDetailId: number | string | null;
    maxDetailId: number | string | null;
  };

  if (await hasAggregateRangeColumns(sql)) {
    const rangeRows = await sql<DrilldownIdRangeRow[]>`
      SELECT
        a.min_detail_id AS "minDetailId",
        a.max_detail_id AS "maxDetailId"
      FROM serving.cusip_quarter_investor_activity a
      WHERE a.ticker = ${ticker}
        AND a.quarter = ${quarter}
        AND (${cusip}::text IS NULL OR a.cusip = ${cusip})
        AND a.min_detail_id IS NOT NULL
        AND a.max_detail_id IS NOT NULL
      ORDER BY a.min_detail_id ASC
    `;

    return {
      ranges: rangeRows.flatMap((row) => {
        const minDetailId = Number(row.minDetailId);
        const maxDetailId = Number(row.maxDetailId);

        if (!Number.isFinite(minDetailId) || !Number.isFinite(maxDetailId)) {
          return [];
        }

        return [{ minDetailId, maxDetailId }];
      }),
      useLegacyDetailQuery: false,
    };
  }

  if (!cusip) {
    return { ranges: [] as DrilldownIdRange[], useLegacyDetailQuery: true };
  }

  const [lastRow] = await sql<DrilldownDetailKeyRow[]>`
    SELECT id, cusip, quarter
    FROM serving.cusip_quarter_investor_activity_detail
    ORDER BY id DESC
    LIMIT 1
  `;

  if (!lastRow) {
    return { ranges: [] as DrilldownIdRange[], useLegacyDetailQuery: false };
  }

  const maxId = Number(lastRow.id);
  if (!Number.isFinite(maxId) || compareDetailSelection(lastRow, { cusip, quarter }) < 0) {
    return { ranges: [] as DrilldownIdRange[], useLegacyDetailQuery: false };
  }

  const firstDetailId = await findDetailBoundaryByPrimaryKey(sql, "first", { cusip, quarter }, maxId);
  const lastDetailId = await findDetailBoundaryByPrimaryKey(sql, "last", { cusip, quarter }, maxId);

  if (firstDetailId == null || lastDetailId == null) {
    return { ranges: [] as DrilldownIdRange[], useLegacyDetailQuery: false };
  }

  return {
    ranges: [{ minDetailId: firstDetailId, maxDetailId: lastDetailId }],
    useLegacyDetailQuery: false,
  };
}
