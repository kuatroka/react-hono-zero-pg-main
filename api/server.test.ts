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
});
