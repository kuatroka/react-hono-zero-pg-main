import { describe, expect, test } from "bun:test";
import { schema } from "./schema";

describe("schema", () => {
  test("includes the investor activity aggregate table, raw detail table, and Zero-facing drilldown cache", () => {
    expect("cusip_quarter_investor_activity" in schema.tables).toBe(true);
    expect("cusip_quarter_investor_activity_detail" in schema.tables).toBe(true);
    expect("asset_investor_activity_drilldown_zero" in schema.tables).toBe(true);
    expect("asset_investor_activity_drilldown_hydration" in schema.tables).toBe(true);
  });

  test("exposes the drilldown hydration timestamps in the Zero client schema", () => {
    expect("hydratedAt" in schema.tables.asset_investor_activity_drilldown_zero.columns).toBe(true);
    expect("hydratedAt" in schema.tables.asset_investor_activity_drilldown_hydration.columns).toBe(true);
  });
});
