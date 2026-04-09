import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const packageJson = JSON.parse(
  readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
);

describe("dev startup scripts", () => {
  it("starts Postgres before the app stack", () => {
    expect(packageJson.scripts.dev).toContain("dev:db-up");
    expect(packageJson.scripts.dev).toContain("dev:serve");
  });

  it("waits for Postgres before Zero starts", () => {
    expect(packageJson.scripts["dev:zero-cache"]).toContain("db-preflight");
  });

  it("uses the shared app stack helper from dev:all", () => {
    expect(packageJson.scripts["dev:all"]).toBe("bun run dev");
  });
});
