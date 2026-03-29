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
});
