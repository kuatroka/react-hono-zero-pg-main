export type InvestorActivitySelection = Readonly<{
  quarter: string;
  action: "open" | "close";
}>;

type InvestorActivityRowPreview = Readonly<{
  quarter: string;
  numOpen?: number | null;
  numClose?: number | null;
}>;

function hasPositiveValue(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

export function resolveDefaultInvestorActivitySelection(
  rows: readonly InvestorActivityRowPreview[],
): InvestorActivitySelection | null {
  if (rows.length === 0) {
    return null;
  }

  const latestQuarterRow = rows[rows.length - 1];
  if (!latestQuarterRow?.quarter) {
    return null;
  }

  if (hasPositiveValue(latestQuarterRow.numOpen)) {
    return { quarter: latestQuarterRow.quarter, action: "open" };
  }

  if (hasPositiveValue(latestQuarterRow.numClose)) {
    return { quarter: latestQuarterRow.quarter, action: "close" };
  }

  for (let index = rows.length - 2; index >= 0; index -= 1) {
    const row = rows[index];
    if (!row?.quarter) {
      continue;
    }

    if (hasPositiveValue(row.numOpen)) {
      return { quarter: row.quarter, action: "open" };
    }

    if (hasPositiveValue(row.numClose)) {
      return { quarter: row.quarter, action: "close" };
    }
  }

  return { quarter: latestQuarterRow.quarter, action: "open" };
}
