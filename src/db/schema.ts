import {
  bigint,
  boolean,
  check,
  decimal,
  doublePrecision,
  index,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const servingSchema = pgSchema("serving");
export const appStateSchema = pgSchema("app_state");
export const rawSchema = pgSchema("raw");

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    partner: boolean("partner").notNull(),
  },
  (table) => [index("idx_user_name").on(table.name, table.id)]
);

export const medium = pgTable(
  "medium",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [index("idx_medium_name").on(table.name, table.id)]
);

export const message = pgTable(
  "message",
  {
    id: text("id").primaryKey(),
    senderId: text("sender_id").references(() => user.id),
    mediumId: text("medium_id").references(() => medium.id),
    body: text("body").notNull(),
    labels: text("labels").array().notNull(),
    timestamp: timestamp("timestamp").notNull(),
  },
  (table) => [index("idx_message_timestamp").on(table.timestamp, table.id)]
);

export const counters = servingSchema.table(
  "counters",
  {
    id: text("id").primaryKey(),
    value: doublePrecision("value").notNull(),
  },
  (table) => [index("idx_counters_id").on(table.id)]
);

export const valueQuarters = servingSchema.table(
  "value_quarters",
  {
    quarter: text("quarter").primaryKey(),
    value: doublePrecision("value").notNull(),
  },
  (table) => [index("idx_value_quarters_quarter").on(table.quarter)]
);

export const entities = servingSchema.table(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description"),
    value: decimal("value", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    check("category_check", sql`${table.category} IN ('investor', 'asset')`),
    index("idx_entities_category").on(table.category),
    index("idx_entities_name").on(table.name),
  ]
);

export const userCounters = appStateSchema.table(
  "user_counters",
  {
    userId: text("user_id").primaryKey(),
    value: doublePrecision("value").notNull().default(0),
  },
  (table) => [index("idx_user_counters_user_id").on(table.userId)]
);

export const searches = servingSchema.table(
  "searches",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull(),
    name: text("name"),
    category: text("category").notNull(),
    cusip: text("cusip"),
  },
  (table) => [
    check(
      "searches_category_check",
      sql`${table.category} IN ('superinvestors', 'assets', 'periods')`
    ),
    index("idx_searches_category").on(table.category),
    index("idx_searches_code").on(table.code),
    index("idx_searches_name").on(table.name),
  ]
);

export const superinvestors = servingSchema.table(
  "superinvestors",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    cik: text("cik").notNull(),
    cikName: text("cik_name"),
    cikTicker: text("cik_ticker"),
    activePeriods: text("active_periods"),
  },
  (table) => [index("idx_superinvestors_cik_name").on(table.cikName, table.id)]
);

export const assets = servingSchema.table(
  "assets",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    asset: text("asset").notNull(),
    assetName: text("asset_name"),
    cusip: text("cusip"),
  },
  (table) => [
    index("idx_assets_asset").on(table.asset),
    index("idx_assets_asset_name").on(table.assetName, table.id),
    index("idx_assets_cusip").on(table.cusip),
  ]
);

export const periods = servingSchema.table("periods", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  period: text("period").notNull().unique(),
});

export const cusipQuarterInvestorActivity = servingSchema.table(
  "cusip_quarter_investor_activity",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    cusip: varchar("cusip"),
    ticker: varchar("ticker"),
    quarter: varchar("quarter"),
    numOpen: bigint("num_open", { mode: "number" }),
    numAdd: bigint("num_add", { mode: "number" }),
    numReduce: bigint("num_reduce", { mode: "number" }),
    numClose: bigint("num_close", { mode: "number" }),
    numHold: bigint("num_hold", { mode: "number" }),
    minDetailId: bigint("min_detail_id", { mode: "number" }),
    maxDetailId: bigint("max_detail_id", { mode: "number" }),
  },
  (table) => [
    index("idx_cusip_quarter_activity_cusip_quarter").on(table.cusip, table.quarter),
    index("idx_cusip_quarter_activity_ticker_quarter").on(table.ticker, table.quarter),
  ]
);

export const cusipQuarterInvestorActivityDetail = servingSchema.table(
  "cusip_quarter_investor_activity_detail",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    cusip: varchar("cusip"),
    ticker: varchar("ticker"),
    quarter: varchar("quarter"),
    cik: bigint("cik", { mode: "number" }),
    didOpen: boolean("did_open"),
    didAdd: boolean("did_add"),
    didReduce: boolean("did_reduce"),
    didClose: boolean("did_close"),
    didHold: boolean("did_hold"),
  },
);

export const assetInvestorActivityDrilldownZero = servingSchema.table(
  "asset_investor_activity_drilldown_zero",
  {
    id: text("id").notNull(),
    assetKey: text("asset_key").notNull(),
    ticker: text("ticker").notNull(),
    cusip: text("cusip"),
    quarter: text("quarter").notNull(),
    action: text("action").notNull(),
    cikName: text("cik_name").notNull(),
    cik: text("cik").notNull(),
    cikTicker: text("cik_ticker").notNull(),
    detailId: bigint("detail_id", { mode: "number" }).notNull(),
    hydratedAt: timestamp("hydrated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "asset_investor_activity_drilldown_zero_action_check",
      sql`${table.action} IN ('open', 'close')`
    ),
    primaryKey({
      columns: [table.assetKey, table.quarter, table.action, table.cikName, table.cik, table.detailId],
    }),
  ]
);

export const assetInvestorActivityDrilldownHydration = servingSchema.table(
  "asset_investor_activity_drilldown_hydration",
  {
    assetKey: text("asset_key").primaryKey(),
    ticker: text("ticker").notNull(),
    cusip: text("cusip"),
    status: text("status").notNull(),
    defaultQuarter: text("default_quarter"),
    defaultAction: text("default_action"),
    rowCount: bigint("row_count", { mode: "number" }).notNull().default(0),
    hydratedAt: timestamp("hydrated_at"),
    errorMessage: text("error_message"),
  },
  (table) => [
    check(
      "asset_investor_activity_drilldown_hydration_status_check",
      sql`${table.status} IN ('pending', 'ready', 'error')`
    ),
    check(
      "asset_investor_activity_drilldown_hydration_default_action_check",
      sql`${table.defaultAction} IS NULL OR ${table.defaultAction} IN ('open', 'close')`
    ),
  ]
);
