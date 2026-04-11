import { describe, expect, mock, test } from "bun:test";

describe("queries", () => {
  test("defines investor activity queries", async () => {
    mock.restore();
    const { queries } = await import(`./queries?scenario=${Date.now()}`);

    expect(typeof queries.investorActivityByCusip).toBe("function");
    expect(typeof queries.investorActivityByTicker).toBe("function");
    expect(typeof queries.investorActivityDrilldownByCusip).toBe("function");
    expect(typeof queries.investorActivityDrilldownByTicker).toBe("function");
    expect(typeof queries.investorActivityDrilldownByDetailRange).toBe("function");
    expect(typeof queries.superinvestorsByCiks).toBe("function");
    expect(queries.investorActivityByCusip("05330T205")).toBeTruthy();
    expect(queries.investorActivityByTicker("AMIX")).toBeTruthy();
    expect(queries.investorActivityDrilldownByCusip("05330T205", "2024Q4", "open")).toBeTruthy();
    expect(queries.investorActivityDrilldownByTicker("AMIX", "2024Q4", "close")).toBeTruthy();
    expect(queries.investorActivityDrilldownByDetailRange(1, 10, "open")).toBeTruthy();
    expect(queries.superinvestorsByCiks(["1001", "1002"])).toBeTruthy();
  });
});
