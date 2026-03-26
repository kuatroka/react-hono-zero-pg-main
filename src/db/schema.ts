import { pgSchema, text, doublePrecision, varchar, decimal, timestamp, uuid, bigint, check, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const servingSchema = pgSchema("serving");
export const appStateSchema = pgSchema("app_state");
export const rawSchema = pgSchema("raw");

export const counters = servingSchema.table("counters", {
  id: text("id").primaryKey(),
  value: doublePrecision("value").notNull(),
});

export const valueQuarters = servingSchema.table("value_quarters", {
  quarter: text("quarter").primaryKey(),
  value: doublePrecision("value").notNull(),
});

export const entities = servingSchema.table("entities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  value: decimal("value", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  categoryCheck: check("category_check", sql`${table.category} IN ('investor', 'asset')`),
}));

export const userCounters = appStateSchema.table("user_counters", {
  userId: text("user_id").primaryKey(),
  value: doublePrecision("value").notNull().default(0),
});

export const searches = servingSchema.table("searches", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  cusip: text("cusip"),
  code: text("code").notNull(),
  name: text("name"),
  category: text("category").notNull(),
}, (table) => ({
  categoryCheck: check("searches_category_check", sql`${table.category} IN ('superinvestors', 'assets', 'periods')`),
}));

export const superinvestors = servingSchema.table("superinvestors", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  cik: text("cik").notNull(),
  cikName: text("cik_name"),
  cikTicker: text("cik_ticker"),
  activePeriods: text("active_periods"),
});

export const assets = servingSchema.table("assets", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  cusip: text("cusip"),
  asset: text("asset").notNull(),
  assetName: text("asset_name"),
});

export const periods = servingSchema.table("periods", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  period: text("period").notNull().unique(),
});

export const cusipQuarterInvestorActivity = servingSchema.table("cusip_quarter_investor_activity", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  cusip: varchar("cusip"),
  ticker: varchar("ticker"),
  quarter: varchar("quarter"),
  numOpen: bigint("num_open", { mode: "number" }),
  numAdd: bigint("num_add", { mode: "number" }),
  numReduce: bigint("num_reduce", { mode: "number" }),
  numClose: bigint("num_close", { mode: "number" }),
  numHold: bigint("num_hold", { mode: "number" }),
});

export const cusipQuarterInvestorActivityDetail = servingSchema.table("cusip_quarter_investor_activity_detail", {
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
});
