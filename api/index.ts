import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { SignJWT } from "jose";
import { hydrateInvestorActivityDrilldown } from "./investor-activity-drilldown-hydration";
import { resolveDrilldownIdRanges } from "./investor-activity-drilldown-ranges";
import zeroRoutes from "./routes/zero/get-queries";

export const config = {
  runtime: "edge",
};

export const app = new Hono().basePath("/api");

app.route("/zero", zeroRoutes);

app.post("/investor-activity-drilldown/hydrate", async (c) => {
  try {
    const payload = await c.req.json() as { ticker?: string; cusip?: string | null };
    const ticker = payload.ticker?.trim();
    const cusip = payload.cusip?.trim() || null;

    if (!ticker) {
      return c.json({ error: "ticker is required" }, 400);
    }

    const { sql } = await import("./db");
    const result = await hydrateInvestorActivityDrilldown(sql as never, {
      ticker,
      cusip,
    });

    return c.json(result);
  } catch (error) {
    console.error("/api/investor-activity-drilldown/hydrate error", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

app.get("/investor-activity-drilldown", async (c) => {
  const ticker = c.req.query("ticker")?.trim();
  const quarter = c.req.query("quarter")?.trim();
  const action = c.req.query("action")?.trim();
  const cusip = c.req.query("cusip")?.trim() || null;

  if (!ticker || !quarter || (action !== "open" && action !== "close")) {
    return c.json({ error: "ticker, quarter, and action=open|close are required" }, 400);
  }

  try {
    const { sql } = await import("./db");
    type DrilldownApiRow = {
      id: number | string;
      cik: string;
      cikName: string | null;
      cikTicker: string | null;
      quarter: string;
      action: "open" | "close";
    };
    const {
      ranges,
      useLegacyDetailQuery,
    } = await resolveDrilldownIdRanges(sql, { ticker, quarter, cusip });

    if (!useLegacyDetailQuery && ranges.length === 0) {
      return c.json({ rows: [] });
    }

    const rangeValuesSql = ranges
      .map(({ minDetailId, maxDetailId }) => `(${minDetailId}, ${maxDetailId})`)
      .join(", ");

    const result: DrilldownApiRow[] = useLegacyDetailQuery
      ? action === "open"
        ? await sql<DrilldownApiRow[]>`
            SELECT
              d.id,
              d.cik::text AS "cik",
              s.cik_name AS "cikName",
              s.cik_ticker AS "cikTicker",
              d.quarter,
              CAST('open' AS text) AS "action"
            FROM serving.cusip_quarter_investor_activity_detail d
            LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
            WHERE d.ticker = ${ticker}
              AND d.quarter = ${quarter}
              AND (${cusip}::text IS NULL OR d.cusip = ${cusip})
              AND d.did_open = true
            ORDER BY COALESCE(s.cik_name, d.cik::text) ASC, d.id ASC
          `
        : await sql<DrilldownApiRow[]>`
            SELECT
              d.id,
              d.cik::text AS "cik",
              s.cik_name AS "cikName",
              s.cik_ticker AS "cikTicker",
              d.quarter,
              CAST('close' AS text) AS "action"
            FROM serving.cusip_quarter_investor_activity_detail d
            LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
            WHERE d.ticker = ${ticker}
              AND d.quarter = ${quarter}
              AND (${cusip}::text IS NULL OR d.cusip = ${cusip})
              AND d.did_close = true
            ORDER BY COALESCE(s.cik_name, d.cik::text) ASC, d.id ASC
          `
      : action === "open"
      ? await sql<DrilldownApiRow[]>`
          WITH selected_ranges(min_detail_id, max_detail_id) AS (
            VALUES ${sql.unsafe(rangeValuesSql)}
          )
          SELECT
            d.id,
            d.cik::text AS "cik",
            s.cik_name AS "cikName",
            s.cik_ticker AS "cikTicker",
            d.quarter,
            CAST('open' AS text) AS "action"
          FROM selected_ranges r
          JOIN serving.cusip_quarter_investor_activity_detail d
            ON d.id BETWEEN r.min_detail_id AND r.max_detail_id
          LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
          WHERE d.ticker = ${ticker}
            AND d.quarter = ${quarter}
            AND (${cusip}::text IS NULL OR d.cusip = ${cusip})
            AND d.did_open = true
          ORDER BY COALESCE(s.cik_name, d.cik::text) ASC, d.id ASC
        `
      : await sql<DrilldownApiRow[]>`
          WITH selected_ranges(min_detail_id, max_detail_id) AS (
            VALUES ${sql.unsafe(rangeValuesSql)}
          )
          SELECT
            d.id,
            d.cik::text AS "cik",
            s.cik_name AS "cikName",
            s.cik_ticker AS "cikTicker",
            d.quarter,
            CAST('close' AS text) AS "action"
          FROM selected_ranges r
          JOIN serving.cusip_quarter_investor_activity_detail d
            ON d.id BETWEEN r.min_detail_id AND r.max_detail_id
          LEFT JOIN serving.superinvestors s ON s.cik = d.cik::text
          WHERE d.ticker = ${ticker}
            AND d.quarter = ${quarter}
            AND (${cusip}::text IS NULL OR d.cusip = ${cusip})
            AND d.did_close = true
          ORDER BY COALESCE(s.cik_name, d.cik::text) ASC, d.id ASC
        `;

    const rows = Array.from(result, (row) => ({
      id: Number(row.id),
      cik: row.cik,
      cikName: row.cikName,
      cikTicker: row.cikTicker,
      quarter: row.quarter,
      action: row.action,
    }));

    return c.json({ rows });
  } catch (error) {
    console.error("/api/investor-activity-drilldown error", error);
    return c.json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// See seed.sql
// In real life you would of course authenticate the user however you like.
const userIDs = [
  "6z7dkeVLNm",
  "ycD76wW4R2",
  "IoQSaxeVO5",
  "WndZWmGkO4",
  "ENzoNm7g4E",
  "dLKecN3ntd",
  "7VoEoJWEwn",
  "enVvyDlBul",
  "9ogaDuDNFx",
];

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

app.get("/login", async (c) => {
  const jwtPayload = {
    sub: userIDs[randomInt(userIDs.length)],
    iat: Math.floor(Date.now() / 1000),
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30days")
    .sign(new TextEncoder().encode(must(process.env.ZERO_AUTH_SECRET)));

  setCookie(c, "jwt", jwt, {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return c.text("ok");
});


function must<T>(val: T) {
  if (!val) {
    throw new Error("Expected value to be defined");
  }
  return val;
}
