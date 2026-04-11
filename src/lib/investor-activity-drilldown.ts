import type { InvestorActivitySelection } from "./investor-activity-selection";

export type InvestorActivityDrilldownAction = InvestorActivitySelection["action"];

export type InvestorActivityDrilldownRowKeyParts = Readonly<{
  assetKey: string;
  quarter: string;
  action: InvestorActivityDrilldownAction;
  cikName: string;
  cik: string;
  detailId: number;
}>;

export function buildInvestorActivityDrilldownAssetKey(ticker: string, cusip: string | null) {
  return cusip ? `cusip:${cusip}` : `ticker:${ticker}`;
}

export function stringifyInvestorActivityDrilldownRowKey(parts: InvestorActivityDrilldownRowKeyParts) {
  return JSON.stringify(parts);
}

export function parseInvestorActivityDrilldownRowKey(value: string): InvestorActivityDrilldownRowKeyParts | null {
  try {
    const parsed = JSON.parse(value) as Partial<InvestorActivityDrilldownRowKeyParts>;
    if (
      typeof parsed.assetKey !== "string" ||
      typeof parsed.quarter !== "string" ||
      (parsed.action !== "open" && parsed.action !== "close") ||
      typeof parsed.cikName !== "string" ||
      typeof parsed.cik !== "string" ||
      typeof parsed.detailId !== "number"
    ) {
      return null;
    }

    return parsed as InvestorActivityDrilldownRowKeyParts;
  } catch {
    return null;
  }
}
