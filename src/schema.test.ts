import { describe, expect, test } from "bun:test";
import { schema } from "./schema";

describe("schema", () => {
  test("includes only the investor activity aggregate table in the Zero client schema", () => {
    expect("cusip_quarter_investor_activity" in schema.tables).toBe(true);
    expect("cusip_quarter_investor_activity_detail" in schema.tables).toBe(false);
  });
});
