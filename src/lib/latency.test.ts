import { describe, expect, test } from "bun:test";
import { resolveLatencyMs } from "./latency";

describe("resolveLatencyMs", () => {
  test("clamps to the minimum visible latency", () => {
    expect(resolveLatencyMs(100, 100.02)).toBe(0.1);
  });

  test("preserves chart-specific elapsed values", () => {
    const uplotLatencyMs = resolveLatencyMs(100, 112.5);
    const echartsLatencyMs = resolveLatencyMs(100, 147.25);

    expect(uplotLatencyMs).toBe(12.5);
    expect(echartsLatencyMs).toBe(47.25);
    expect(uplotLatencyMs).not.toBe(echartsLatencyMs);
  });
});
