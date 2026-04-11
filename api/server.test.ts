import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSpaFetchHandler, startServer } from "./server";

const tempDirs: string[] = [];
const originalEnv = { ...process.env };

function makeTempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "bun-server-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }

  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
});

describe("startServer", () => {
  test("logs the frontend and backend URLs on startup", () => {
    const serve = mock(() => ({ stop() {} }));
    const log = mock(() => {});

    startServer({
      port: 4321,
      serve,
      log,
    });

    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 4321,
      }),
    );
    expect(log).toHaveBeenCalledWith(
      "Dev server ready: frontend http://localhost:4321 | backend http://localhost:4321/api",
    );
  });
});

describe("createSpaFetchHandler", () => {
  test("responds to /healthz for deployment checks", async () => {
    const distDir = makeTempDir();
    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/healthz"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  test("passes through API requests to the Hono app", async () => {
    process.env.ZERO_AUTH_SECRET = "test-secret";

    const distDir = makeTempDir();
    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/api/login"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(response.headers.get("set-cookie")).toContain("jwt=");
  });

  test("serves investor drilldown rows from the API via aggregate id ranges before reading detail rows", async () => {
    const sqlCalls: string[] = [];
    const sql = mock(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = String.raw({ raw: strings }, ...values.map(() => "?"));
      sqlCalls.push(query);

      if (query.includes("FROM information_schema.columns")) {
        return [{ hasColumns: true }];
      }

      if (query.includes("FROM serving.cusip_quarter_investor_activity a")) {
        return [{ minDetailId: 11, maxDetailId: 19 }];
      }

      if (query.includes("FROM selected_ranges r")) {
        return [
          {
            id: 1,
            cik: "123456",
            cikName: "Alpha Capital",
            cikTicker: "ALPH",
            quarter: "2024Q4",
            action: "open",
          },
        ];
      }

      return [];
    });
    (sql as typeof sql & { unsafe: (query: string) => string }).unsafe = (query: string) => query;
    mock.module("./db", () => ({ sql }));

    const distDir = makeTempDir();
    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(
      new Request("http://localhost/api/investor-activity-drilldown?ticker=GBNK&cusip=40075T102&quarter=2024Q4&action=open"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        {
          id: 1,
          cik: "123456",
          cikName: "Alpha Capital",
          cikTicker: "ALPH",
          quarter: "2024Q4",
          action: "open",
        },
      ],
    });
    expect(sql).toHaveBeenCalledTimes(3);
    expect(sqlCalls[0]).toContain("FROM information_schema.columns");
    expect(sqlCalls[1]).toContain("FROM serving.cusip_quarter_investor_activity a");
    expect(sqlCalls[2]).toContain("FROM selected_ranges r");
  });

  test("returns no drilldown rows when no aggregate id range exists for the selection", async () => {
    const sqlCalls: string[] = [];
    const sql = mock(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = String.raw({ raw: strings }, ...values.map(() => "?"));
      sqlCalls.push(query);

      if (query.includes("FROM information_schema.columns")) {
        return [{ hasColumns: true }];
      }

      if (query.includes("FROM serving.cusip_quarter_investor_activity a")) {
        return [];
      }

      throw new Error("detail table query should not run without id ranges");
    });
    (sql as typeof sql & { unsafe: (query: string) => string }).unsafe = (query: string) => query;
    mock.module("./db", () => ({ sql }));

    const distDir = makeTempDir();
    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(
      new Request("http://localhost/api/investor-activity-drilldown?ticker=AAPB&cusip=00768Y644&quarter=2026Q1&action=close"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rows: [] });
    expect(sql).toHaveBeenCalledTimes(2);
    expect(sqlCalls[0]).toContain("FROM information_schema.columns");
    expect(sqlCalls[1]).toContain("FROM serving.cusip_quarter_investor_activity a");
  });

  test("falls back to primary-key range discovery when aggregate range columns are absent", async () => {
    const sqlCalls: string[] = [];
    const rowsById = new Map<number, { id: number; cusip: string; quarter: string }>([
      [1, { id: 1, cusip: "00768Y643", quarter: "2025Q4" }],
      [2, { id: 2, cusip: "00768Y643", quarter: "2026Q1" }],
      [3, { id: 3, cusip: "00768Y643", quarter: "2026Q2" }],
      [4, { id: 4, cusip: "00768Y644", quarter: "2025Q4" }],
      [5, { id: 5, cusip: "00768Y644", quarter: "2026Q1" }],
      [6, { id: 6, cusip: "00768Y644", quarter: "2026Q1" }],
      [7, { id: 7, cusip: "00768Y644", quarter: "2026Q2" }],
      [8, { id: 8, cusip: "00768Y645", quarter: "2026Q1" }],
    ]);
    const sql = mock(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = String.raw({ raw: strings }, ...values.map(() => "?"));
      sqlCalls.push(query);

      if (query.includes("FROM information_schema.columns")) {
        return [{ hasColumns: false }];
      }

      if (query.includes("ORDER BY id DESC")) {
        return [rowsById.get(8)];
      }

      if (query.includes("WHERE id =")) {
        return [rowsById.get(Number(values[0]))];
      }

      if (query.includes("FROM selected_ranges r")) {
        return [
          {
            id: 6,
            cik: "654321",
            cikName: "Fallback Capital",
            cikTicker: "FBCK",
            quarter: "2026Q1",
            action: "close",
          },
        ];
      }

      return [];
    });
    (sql as typeof sql & { unsafe: (query: string) => string }).unsafe = (query: string) => query;
    mock.module("./db", () => ({ sql }));

    const distDir = makeTempDir();
    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(
      new Request("http://localhost/api/investor-activity-drilldown?ticker=AAPB&cusip=00768Y644&quarter=2026Q1&action=close"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        {
          id: 6,
          cik: "654321",
          cikName: "Fallback Capital",
          cikTicker: "FBCK",
          quarter: "2026Q1",
          action: "close",
        },
      ],
    });
    expect(sqlCalls[0]).toContain("FROM information_schema.columns");
    expect(sqlCalls.some((query) => query.includes("WHERE id ="))).toBe(true);
    expect(sqlCalls.at(-1)).toContain("FROM selected_ranges r");
  });

  test("serves static assets from dist when present", async () => {
    const distDir = makeTempDir();
    mkdirSync(path.join(distDir, "assets"), { recursive: true });
    writeFileSync(path.join(distDir, "assets", "app.js"), 'console.log("hello");');

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/assets/app.js"));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("hello");
  });

  test("falls back to index.html when the client route matches a static directory name", async () => {
    const distDir = makeTempDir();
    mkdirSync(path.join(distDir, "assets"), { recursive: true });
    writeFileSync(path.join(distDir, "index.html"), "<html><body><div id=\"root\">spa</div></body></html>");

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/assets"));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("spa");
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("returns 404 for missing asset paths instead of serving the SPA shell", async () => {
    const distDir = makeTempDir();
    writeFileSync(path.join(distDir, "index.html"), "<html><body><div id=\"root\"></div></body></html>");

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/assets/missing.js"));

    expect(response.status).toBe(404);
  });

  test("falls back to index.html for asset detail routes under /assets", async () => {
    const distDir = makeTempDir();
    writeFileSync(path.join(distDir, "index.html"), "<html><body><div id=\"root\">spa</div></body></html>");

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/assets/AMIX/05330T106"));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("spa");
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("falls back to index.html for asset detail routes when a route param contains a dot", async () => {
    const distDir = makeTempDir();
    writeFileSync(path.join(distDir, "index.html"), "<html><body><div id=\"root\">spa</div></body></html>");

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/assets/BRK.B/084670702"));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("spa");
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("falls back to index.html for non-asset client routes", async () => {
    const distDir = makeTempDir();
    writeFileSync(path.join(distDir, "index.html"), "<html><body><div id=\"root\">spa</div></body></html>");

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/superinvestors/123"));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("spa");
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("injects runtime config into the SPA shell", async () => {
    process.env.APP_PUBLIC_URL = "https://app.example.com";
    process.env.ZERO_PUBLIC_URL = "https://sync.example.com";

    const distDir = makeTempDir();
    writeFileSync(path.join(distDir, "index.html"), "<html><head></head><body><div id=\"root\"></div></body></html>");

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/assets-page"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("window.__APP_CONFIG__");
    expect(html).toContain("https://sync.example.com");
    expect(html).toContain("https://app.example.com/api/zero/get-queries");
  });

  test("strips react-scan from the production SPA shell", async () => {
    process.env.NODE_ENV = "production";

    const distDir = makeTempDir();
    writeFileSync(
      path.join(distDir, "index.html"),
      '<html><head></head><body><script src="https://unpkg.com/react-scan/dist/auto.global.js"></script><div id="root"></div></body></html>',
    );

    const handler = createSpaFetchHandler({ distDir });
    const response = await handler(new Request("http://localhost/"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).not.toContain("react-scan");
    expect(html).toContain("window.__APP_CONFIG__");
  });
});
