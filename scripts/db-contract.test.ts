import { describe, expect, test } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  assets,
  counters,
  cusipQuarterInvestorActivity,
  entities,
  searches,
  superinvestors,
  userCounters,
  valueQuarters,
} from "../src/db/schema";
import { schema as zeroSchema } from "../src/schema";

describe("database contract schemas", () => {
  test("places shared read-model tables in the serving schema", () => {
    expect(getTableConfig(counters).schema).toBe("serving");
    expect(getTableConfig(valueQuarters).schema).toBe("serving");
    expect(getTableConfig(entities).schema).toBe("serving");
    expect(getTableConfig(searches).schema).toBe("serving");
    expect(getTableConfig(superinvestors).schema).toBe("serving");
    expect(getTableConfig(assets).schema).toBe("serving");
    expect(getTableConfig(cusipQuarterInvestorActivity).schema).toBe("serving");
  });

  test("places app-owned state tables in the app_state schema", () => {
    expect(getTableConfig(userCounters).schema).toBe("app_state");
  });

  test("maps Zero tables to their server-side schema-qualified names", () => {
    expect(zeroSchema.tables.counters.serverName).toBe("serving.counters");
    expect(zeroSchema.tables.value_quarters.serverName).toBe("serving.value_quarters");
    expect(zeroSchema.tables.entities.serverName).toBe("serving.entities");
    expect(zeroSchema.tables.searches.serverName).toBe("serving.searches");
    expect(zeroSchema.tables.superinvestors.serverName).toBe("serving.superinvestors");
    expect(zeroSchema.tables.assets.serverName).toBe("serving.assets");
    expect(zeroSchema.tables.user_counters.serverName).toBe("app_state.user_counters");
    expect(zeroSchema.tables.cusip_quarter_investor_activity.serverName).toBe(
      "serving.cusip_quarter_investor_activity",
    );
  });
});
