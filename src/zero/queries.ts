import { escapeLike, syncedQuery } from "@rocicorp/zero";
import { z } from "zod";
import { parseInvestorActivityDrilldownRowKey } from "../lib/investor-activity-drilldown";
import { builder } from "../schema";

const sortDirectionSchema = z.enum(["asc", "desc"]);
const assetVirtualSortColumnSchema = z.enum(["asset", "assetName"]);
const superinvestorVirtualSortColumnSchema = z.enum(["cik", "cikName"]);
const investorActivityDrilldownVirtualSortColumnSchema = z.enum(["cikName"]);

const assetVirtualStartSchema = z.object({
  id: z.number().int(),
  asset: z.string(),
  assetName: z.string(),
  cusip: z.string(),
});

const superinvestorVirtualStartSchema = z.object({
  id: z.number().int(),
  cik: z.string(),
  cikName: z.string(),
});

const investorActivityDrilldownVirtualStartSchema = z.object({
  assetKey: z.string(),
  quarter: z.string(),
  action: z.enum(["open", "close"]),
  cikName: z.string(),
  cik: z.string(),
  detailId: z.number().int(),
});

export type AssetVirtualStartRow = z.infer<typeof assetVirtualStartSchema>;
export type SuperinvestorVirtualStartRow = z.infer<typeof superinvestorVirtualStartSchema>;
export type AssetVirtualSortColumn = z.infer<typeof assetVirtualSortColumnSchema>;
export type SuperinvestorVirtualSortColumn = z.infer<typeof superinvestorVirtualSortColumnSchema>;
export type InvestorActivityDrilldownVirtualStartRow = z.infer<typeof investorActivityDrilldownVirtualStartSchema>;
export type InvestorActivityDrilldownVirtualSortColumn = z.infer<typeof investorActivityDrilldownVirtualSortColumnSchema>;

export type AssetVirtualListContext = {
  search: string;
  sortColumn: AssetVirtualSortColumn;
  sortDirection: "asc" | "desc";
};

export type SuperinvestorVirtualListContext = {
  search: string;
  sortColumn: SuperinvestorVirtualSortColumn;
  sortDirection: "asc" | "desc";
};

export type InvestorActivityDrilldownVirtualListContext = {
  assetKey: string;
  quarter: string;
  action: "open" | "close";
  search: string;
  sortColumn: InvestorActivityDrilldownVirtualSortColumn;
  sortDirection: "asc" | "desc";
};

export const queries = {
  listUsers: syncedQuery("users.list", z.tuple([]), () =>
    builder.user.orderBy("name", "asc")
  ),
  listMediums: syncedQuery("mediums.list", z.tuple([]), () =>
    builder.medium.orderBy("name", "asc")
  ),
  messagesFeed: syncedQuery(
    "messages.feed",
    z.tuple([z.string().nullable(), z.string().max(500)]),
    (senderId, rawSearch) => {
      const search = rawSearch.trim();
      let query = builder.message
        .related("medium")
        .related("sender")
        .orderBy("timestamp", "desc");

      if (senderId) {
        query = query.where("senderID", "=", senderId);
      }

      if (search) {
        query = query.where("body", "LIKE", `%${escapeLike(search)}%`);
      }

      return query;
    }
  ),
  entitiesByCategory: syncedQuery(
    "entities.byCategory",
    z.tuple([
      z.enum(["all", "investor", "asset"]),
      z.number().int().positive().max(1000),
    ]),
    (category, limit) => {
      const base = builder.entities.orderBy("name", "asc");
      if (category === "all") {
        return base.limit(limit);
      }
      return base.where("category", "=", category).limit(limit);
    }
  ),
  entityById: syncedQuery(
    "entities.byId",
    z.tuple([z.string().min(1)]),
    (entityId) => builder.entities.where("id", "=", entityId).limit(1)
  ),
  searchEntities: syncedQuery(
    "entities.search",
    z.tuple([z.string(), z.number().int().min(0).max(50)]),
    (rawSearch, limit) => {
      const search = rawSearch.trim();
      const base = builder.entities.orderBy("created_at", "desc");
      if (!search) {
        return base.limit(limit);
      }
      return base
        .where("name", "ILIKE", `%${escapeLike(search)}%`)
        .limit(limit);
    }
  ),
  recentEntities: syncedQuery(
    "entities.recent",
    z.tuple([z.number().int().positive().max(500)]),
    (limit) => builder.entities.orderBy("created_at", "desc").limit(limit)
  ),
  counterCurrent: syncedQuery(
    "counter.current",
    z.tuple([z.string()]),
    (id) => builder.counters.where("id", "=", id).limit(1)
  ),
  quartersSeries: syncedQuery(
    "quarters.series",
    z.tuple([]),
    () => builder.value_quarters.orderBy("quarter", "asc")
  ),
  userCounter: syncedQuery(
    "user_counter.current",
    z.tuple([z.string()]),
    (userId) => builder.user_counters.where("userId", "=", userId).limit(1)
  ),
  searchesByName: syncedQuery(
    "searches.byName",
    z.tuple([z.string(), z.number().int().min(0).max(100)]),
    (rawSearch, limit) => {
      const search = rawSearch.trim();
      const base = builder.searches.orderBy("name", "asc");
      if (!search) {
        return base.limit(limit);
      }
      const pattern = `%${escapeLike(search)}%`;
      return base
        .where("name", "ILIKE", pattern)
        .limit(limit);
    }
  ),

  // Separate query for code matches - prioritized in search
  searchesByCode: syncedQuery(
    "searches.byCodePattern",
    z.tuple([z.string(), z.number().int().min(0).max(100)]),
    (rawSearch, limit) => {
      const search = rawSearch.trim();
      const base = builder.searches.orderBy("code", "asc");
      if (!search) {
        return base.limit(limit);
      }
      const pattern = `%${escapeLike(search)}%`;
      return base
        .where("code", "ILIKE", pattern)
        .limit(limit);
    }
  ),
  searchesByCategory: syncedQuery(
    "searches.byCategory",
    z.tuple([z.string(), z.string(), z.number().int().min(0).max(50000)]),
    (category, rawSearch, limit) => {
      const search = rawSearch.trim();
      const base = builder.searches
        .where("category", "=", category)
        .orderBy("name", "asc");

      if (!search) {
        return base.limit(limit);
      }
      const pattern = `%${escapeLike(search)}%`;
      return base
        .where(({ or, cmp }) =>
          or(
            cmp("name", "ILIKE", pattern),
            cmp("code", "ILIKE", pattern)
          )
        )
        .limit(limit);
    }
  ),
  searchById: syncedQuery(
    "searches.byId",
    z.tuple([z.number().int()]),
    (id) => builder.searches.where("id", "=", id).limit(1)
  ),
  searchByCode: syncedQuery(
    "searches.byCode",
    z.tuple([z.string().min(1)]),
    (code) => builder.searches.where("code", "=", code).limit(1)
  ),

  assetsPage: syncedQuery(
    "assets.page",
    z.tuple([z.number().int().min(1).max(50000), z.number().int().min(0)]),
    (limit, _offset) => {
      void _offset;
      return builder.assets
        .orderBy("assetName", "asc")
        .limit(limit);
    }
  ),
  assetsVirtualPage: syncedQuery(
    "assets.virtualPage",
    z.tuple([
      z.number().int().min(1).max(50000),
      assetVirtualStartSchema.nullable(),
      z.enum(["forward", "backward"]),
      z.object({
        search: z.string(),
        sortColumn: assetVirtualSortColumnSchema,
        sortDirection: sortDirectionSchema,
      }),
    ]),
    (limit, start, dir, listContextParams) => {
      const search = listContextParams.search.trim();
      const orderByDir =
        dir === "forward"
          ? listContextParams.sortDirection
          : listContextParams.sortDirection === "asc"
            ? "desc"
            : "asc";

      let query = builder.assets.limit(limit);

      if (search) {
        const pattern = `%${escapeLike(search)}%`;
        query = query.where(({ or, cmp }) =>
          or(
            cmp("asset", "ILIKE", pattern),
            cmp("assetName", "ILIKE", pattern),
            cmp("cusip", "ILIKE", pattern)
          )
        );
      }

      query = query
        .orderBy(listContextParams.sortColumn, orderByDir)
        .orderBy("id", orderByDir);

      if (start) {
        query = query.start(start, { inclusive: false });
      }

      return query;
    }
  ),
  assetsVirtualRowById: syncedQuery(
    "assets.virtualRowById",
    z.tuple([z.string().min(1)]),
    (id) => {
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) {
        return builder.assets.where("id", "=", -1).one();
      }
      return builder.assets.where("id", "=", numericId).one();
    }
  ),
  assetBySymbol: syncedQuery(
    "assets.bySymbol",
    z.tuple([z.string().min(1)]),
    (symbol) =>
      builder.assets.where("asset", "=", symbol).limit(1)
  ),

  superinvestorsPage: syncedQuery(
    "superinvestors.page",
    z.tuple([z.number().int().min(1).max(50000), z.number().int().min(0)]),
    (limit, _offset) => {
      void _offset;
      return builder.superinvestors
        .orderBy("cikName", "asc")
        .limit(limit);
    }
  ),
  superinvestorsVirtualPage: syncedQuery(
    "superinvestors.virtualPage",
    z.tuple([
      z.number().int().min(1).max(50000),
      superinvestorVirtualStartSchema.nullable(),
      z.enum(["forward", "backward"]),
      z.object({
        search: z.string(),
        sortColumn: superinvestorVirtualSortColumnSchema,
        sortDirection: sortDirectionSchema,
      }),
    ]),
    (limit, start, dir, listContextParams) => {
      const search = listContextParams.search.trim();
      const orderByDir =
        dir === "forward"
          ? listContextParams.sortDirection
          : listContextParams.sortDirection === "asc"
            ? "desc"
            : "asc";

      let query = builder.superinvestors.limit(limit);

      if (search) {
        const pattern = `%${escapeLike(search)}%`;
        query = query.where(({ or, cmp }) =>
          or(
            cmp("cik", "ILIKE", pattern),
            cmp("cikName", "ILIKE", pattern),
            cmp("cikTicker", "ILIKE", pattern)
          )
        );
      }

      query = query
        .orderBy(listContextParams.sortColumn, orderByDir)
        .orderBy("id", orderByDir);

      if (start) {
        query = query.start(start, { inclusive: false });
      }

      return query;
    }
  ),
  superinvestorsVirtualRowById: syncedQuery(
    "superinvestors.virtualRowById",
    z.tuple([z.string().min(1)]),
    (id) => {
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) {
        return builder.superinvestors.where("id", "=", -1).one();
      }
      return builder.superinvestors.where("id", "=", numericId).one();
    }
  ),

  superinvestorByCik: syncedQuery(
    "superinvestors.byCik",
    z.tuple([z.string().min(1)]),
    (cik) => builder.superinvestors.where("cik", "=", cik).limit(1)
  ),

  superinvestorsByCiks: syncedQuery(
    "superinvestors.byCiks",
    z.tuple([z.array(z.string().min(1)).max(400)]),
    (ciks) => {
      if (ciks.length === 0) {
        return builder.superinvestors.where("id", "=", -1);
      }

      const [firstCik, ...restCiks] = ciks;
      return builder.superinvestors
        .where(({ or, cmp }) =>
          or(
            cmp("cik", "=", firstCik),
            ...restCiks.map((cik) => cmp("cik", "=", cik)),
          )
        )
        .orderBy("cikName", "asc")
        .orderBy("id", "asc");
    }
  ),

  investorActivityByTicker: syncedQuery(
    "investorActivity.byTicker",
    z.tuple([z.string().min(1)]),
    (ticker) =>
      builder.cusip_quarter_investor_activity
        .where("ticker", "=", ticker)
        .orderBy("quarter", "asc")
  ),

  investorActivityByCusip: syncedQuery(
    "investorActivity.byCusip",
    z.tuple([z.string().min(1)]),
    (cusip) =>
      builder.cusip_quarter_investor_activity
        .where("cusip", "=", cusip)
        .orderBy("quarter", "asc")
  ),

  investorActivityDrilldownByTicker: syncedQuery(
    "investorActivity.drilldownByTicker",
    z.tuple([z.string().min(1), z.string().min(1), z.enum(["open", "close"])]),
    (ticker, quarter, action) =>
      builder.cusip_quarter_investor_activity_detail
        .where("ticker", "=", ticker)
        .where("quarter", "=", quarter)
        .where(action === "open" ? "didOpen" : "didClose", "=", true)
        .orderBy("id", "asc")
  ),

  investorActivityDrilldownByCusip: syncedQuery(
    "investorActivity.drilldownByCusip",
    z.tuple([z.string().min(1), z.string().min(1), z.enum(["open", "close"])]),
    (cusip, quarter, action) =>
      builder.cusip_quarter_investor_activity_detail
        .where("cusip", "=", cusip)
        .where("quarter", "=", quarter)
        .where(action === "open" ? "didOpen" : "didClose", "=", true)
        .orderBy("id", "asc")
  ),

  investorActivityDrilldownByDetailRange: syncedQuery(
    "investorActivity.drilldownByDetailRange",
    z.tuple([
      z.number().int().positive(),
      z.number().int().positive(),
      z.enum(["open", "close"]),
    ]),
    (minDetailId, maxDetailId, action) =>
      builder.cusip_quarter_investor_activity_detail
        .where("id", ">=", minDetailId)
        .where("id", "<=", maxDetailId)
        .where(action === "open" ? "didOpen" : "didClose", "=", true)
        .orderBy("id", "asc")
  ),

  investorActivityDrilldownHydration: syncedQuery(
    "investorActivity.drilldownHydration",
    z.tuple([z.string().min(1)]),
    (assetKey) =>
      builder.asset_investor_activity_drilldown_hydration
        .where("assetKey", "=", assetKey)
        .limit(1)
  ),

  investorActivityDrilldownVirtualPage: syncedQuery(
    "investorActivity.drilldownVirtualPage",
    z.tuple([
      z.number().int().min(1).max(5000),
      investorActivityDrilldownVirtualStartSchema.nullable(),
      z.enum(["forward", "backward"]),
      z.object({
        assetKey: z.string().min(1),
        quarter: z.string().min(1),
        action: z.enum(["open", "close"]),
        search: z.string(),
        sortColumn: investorActivityDrilldownVirtualSortColumnSchema,
        sortDirection: sortDirectionSchema,
      }),
    ]),
    (limit, start, dir, listContextParams) => {
      const search = listContextParams.search.trim();
      const orderByDir =
        dir === "forward"
          ? listContextParams.sortDirection
          : listContextParams.sortDirection === "asc"
            ? "desc"
            : "asc";

      let query = builder.asset_investor_activity_drilldown_zero
        .where("assetKey", "=", listContextParams.assetKey)
        .where("quarter", "=", listContextParams.quarter)
        .where("action", "=", listContextParams.action)
        .limit(limit);

      if (search) {
        const pattern = `%${escapeLike(search)}%`;
        query = query.where(({ or, cmp }) =>
          or(
            cmp("cikName", "ILIKE", pattern),
            cmp("cik", "ILIKE", pattern),
            cmp("cikTicker", "ILIKE", pattern),
          )
        );
      }

      query = query
        .orderBy("cikName", orderByDir)
        .orderBy("cik", orderByDir)
        .orderBy("detailId", orderByDir);

      if (start) {
        query = query.start(start, { inclusive: false });
      }

      return query;
    }
  ),

  investorActivityDrilldownVirtualRowById: syncedQuery(
    "investorActivity.drilldownVirtualRowById",
    z.tuple([z.string().min(1)]),
    (id) => {
      const parsed = parseInvestorActivityDrilldownRowKey(id);
      if (!parsed) {
        return builder.asset_investor_activity_drilldown_zero
          .where("assetKey", "=", "__missing__")
          .one();
      }

      return builder.asset_investor_activity_drilldown_zero
        .where("assetKey", "=", parsed.assetKey)
        .where("quarter", "=", parsed.quarter)
        .where("action", "=", parsed.action)
        .where("cikName", "=", parsed.cikName)
        .where("cik", "=", parsed.cik)
        .where("detailId", "=", parsed.detailId)
        .one();
    }
  ),

  assetByCusip: syncedQuery(
    "assets.byCusip",
    z.tuple([z.string().min(1)]),
    (cusip) =>
      builder.assets.where("cusip", "=", cusip).limit(1)
  ),

  assetBySymbolAndCusip: syncedQuery(
    "assets.bySymbolAndCusip",
    z.tuple([z.string().min(1), z.string().min(1)]),
    (symbol, cusip) =>
      builder.assets
        .where("asset", "=", symbol)
        .where("cusip", "=", cusip)
        .limit(1)
  ),
} as const;

type QueryMap = typeof queries;
export type SyncedQueryName = QueryMap[keyof QueryMap]["queryName"];
