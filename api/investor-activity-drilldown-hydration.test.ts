import { expect, test } from "bun:test";
import { hydrateInvestorActivityDrilldown } from "./investor-activity-drilldown-hydration";

function createSqlMock(
  resolver: (query: string, values: unknown[], inTransaction: boolean) => unknown,
) {
  const calls: Array<{ query: string; values: unknown[]; inTransaction: boolean }> = [];
  type SqlMock = {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
    begin: <T>(callback: (sql: SqlMock) => Promise<T>) => Promise<T>;
    unsafe: (query: string) => string;
  };

  const execute = async (
    strings: TemplateStringsArray,
    values: unknown[],
    inTransaction: boolean,
  ) => {
    const query = String.raw({ raw: strings }, ...values.map(() => "?"));
    calls.push({ query, values, inTransaction });
    return resolver(query, values, inTransaction);
  };

  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => (
    await execute(strings, values, false)
  )) as SqlMock;
  sql.unsafe = (query) => query;

  sql.begin = async <T>(callback: (tx: SqlMock) => Promise<T>) => {
    const tx = (async (strings: TemplateStringsArray, ...values: unknown[]) => (
      await execute(strings, values, true)
    )) as SqlMock;
    tx.begin = sql.begin;
    tx.unsafe = sql.unsafe;
    return await callback(tx);
  };

  return { sql, calls };
}

test("hydrates the Zero-facing drilldown cache and returns the latest positive default selection", async () => {
  const { sql, calls } = createSqlMock((query) => {
    if (query.includes("FROM information_schema.columns")) {
      return [{ hasColumns: true }];
    }

    if (query.includes('a.min_detail_id AS "minDetailId"')) {
      return [{ minDetailId: 1, maxDetailId: 10 }];
    }

    if (query.includes("FROM serving.cusip_quarter_investor_activity")) {
      return [
        { quarter: "2024Q3", numOpen: 1, numClose: 0 },
        { quarter: "2024Q4", numOpen: 4, numClose: 2 },
      ];
    }

    if (query.includes('SELECT COUNT(*)::bigint AS "rowCount" FROM inserted')) {
      return [{ rowCount: 6 }];
    }

    return [];
  });

  const result = await hydrateInvestorActivityDrilldown(sql as never, {
    ticker: "GBNK",
    cusip: "40075T102",
  });

  expect(result).toEqual({
    assetKey: "cusip:40075T102",
    defaultSelection: {
      quarter: "2024Q4",
      action: "open",
    },
  });
  expect(calls.some((call) => call.query.includes("DELETE FROM serving.asset_investor_activity_drilldown_zero"))).toBe(true);
  expect(calls.some((call) => call.query.includes("WITH selected_ranges"))).toBe(true);
  expect(calls.some((call) => call.query.includes("UPDATE serving.asset_investor_activity_drilldown_hydration"))).toBe(true);
});

test("records an error status when drilldown hydration fails", async () => {
  const { sql, calls } = createSqlMock((query, _values, inTransaction) => {
    if (inTransaction && query.includes("FROM serving.cusip_quarter_investor_activity")) {
      throw new Error("boom");
    }

    return [];
  });

  await expect(
    hydrateInvestorActivityDrilldown(sql as never, {
      ticker: "GBNK",
      cusip: "40075T102",
    }),
  ).rejects.toThrow("boom");
  expect(calls.some((call) => !call.inTransaction && call.query.includes("status = 'error'"))).toBe(true);
});

test("reuses an already-ready drilldown cache instead of rebuilding it", async () => {
  const { sql, calls } = createSqlMock((query) => {
    if (query.includes("FROM serving.asset_investor_activity_drilldown_hydration")) {
      return [{
        status: "ready",
        defaultQuarter: "2024Q4",
        defaultAction: "open",
        rowCount: 7,
      }];
    }

    return [];
  });

  const result = await hydrateInvestorActivityDrilldown(sql as never, {
    ticker: "GBNK",
    cusip: "40075T102",
  });

  expect(result).toEqual({
    assetKey: "cusip:40075T102",
    defaultSelection: {
      quarter: "2024Q4",
      action: "open",
    },
  });
  expect(calls.some((call) => call.query.includes("DELETE FROM serving.asset_investor_activity_drilldown_zero"))).toBe(false);
  expect(calls.some((call) => call.query.includes("FROM serving.cusip_quarter_investor_activity"))).toBe(false);
});

test("rebuilds a stale ready cache when it claims zero rows but aggregate rows exist", async () => {
  const { sql, calls } = createSqlMock((query) => {
    if (query.includes("FROM serving.asset_investor_activity_drilldown_hydration")) {
      return [{
        status: "ready",
        defaultQuarter: null,
        defaultAction: null,
        rowCount: 0,
      }];
    }

    if (query.includes("FROM information_schema.columns")) {
      return [{ hasColumns: true }];
    }

    if (query.includes('a.min_detail_id AS "minDetailId"')) {
      return [{ minDetailId: 11, maxDetailId: 20 }];
    }

    if (query.includes("FROM serving.cusip_quarter_investor_activity")) {
      return [
        { quarter: "2024Q3", numOpen: 0, numClose: 2 },
      ];
    }

    if (query.includes('SELECT COUNT(*)::bigint AS "rowCount" FROM inserted')) {
      return [{ rowCount: 2 }];
    }

    return [];
  });

  const result = await hydrateInvestorActivityDrilldown(sql as never, {
    ticker: "GBNK",
    cusip: "40075T102",
  });

  expect(result).toEqual({
    assetKey: "cusip:40075T102",
    defaultSelection: {
      quarter: "2024Q3",
      action: "close",
    },
  });
  expect(calls.some((call) => call.query.includes("DELETE FROM serving.asset_investor_activity_drilldown_zero"))).toBe(true);
  expect(calls.some((call) => call.query.includes("WITH selected_ranges"))).toBe(true);
});
