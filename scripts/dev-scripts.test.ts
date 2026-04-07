import { describe, expect, test } from "bun:test";
import packageJson from "../package.json" assert { type: "json" };

describe("bun-only development scripts", () => {
  test("dev orchestration starts Bun server, css watch, frontend bundle watch, and Zero without Vite", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts["dev:ui"]).toBeUndefined();
    expect(scripts["dev:app"]).toBeDefined();
    expect(scripts["dev:app"]).toContain("scripts/build-app.ts --watch");
    expect(scripts["dev:api"]).toContain("bun run --watch api/server.ts");
    expect(scripts["dev:serve"]).toContain("bun run dev:api");
    expect(scripts["dev:serve"]).toContain("bun run dev:css");
    expect(scripts["dev:serve"]).toContain("bun run dev:app");
    expect(scripts["dev:serve"]).toContain("bun run dev:zero-cache");
    expect(scripts["dev:serve"]).not.toContain("vite");
  });

  test("default dev command bootstraps the database schema before serving", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts["dev"]).toContain("bun run dev:db-up");
    expect(scripts["dev"]).toContain("bun run dev:bootstrap-db");
    expect(scripts["dev"]).toContain("bun run dev:serve");
    expect(scripts["dev:bootstrap-db"]).toContain("bun scripts/db-preflight.ts");
    expect(scripts["dev:bootstrap-db"]).toContain("bun run db:migrate");
    expect(scripts["dev:bootstrap-db"]).toContain("bun run db:seed");
  });

  test("db seed respects an already-provided ZERO_UPSTREAM_DB override", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts["db:seed"]).toContain('if [ -z "${ZERO_UPSTREAM_DB:-}" ]; then');
    expect(scripts["db:seed"]).toContain("source .env");
    expect(scripts["db:seed"]).toContain("bun run scripts/db-seed.ts");
  });
});
