import { describe, expect, it } from "bun:test";

import { ensureUpstreamDbReachable } from "./db-preflight";

describe("ensureUpstreamDbReachable", () => {
  it("surfaces a clear local-dev message when Postgres is not running", async () => {
    const connectionRefused = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED",
    });

    await expect(
      ensureUpstreamDbReachable(
        "postgresql://user:password@127.0.0.1:5432/postgres",
        async () => {
          throw connectionRefused;
        },
        { retries: 1, retryDelayMs: 0 },
      ),
    ).rejects.toThrow(/Start Postgres with `bun run dev:db-up` or use `bun run dev:all`\./);
  });

  it("returns without error when the upstream check succeeds", async () => {
    await expect(
      ensureUpstreamDbReachable(
        "postgresql://user:password@127.0.0.1:5432/postgres",
        async () => {},
      ),
    ).resolves.toBeUndefined();
  });

  it("retries transient startup failures before succeeding", async () => {
    let attempts = 0;

    await expect(
      ensureUpstreamDbReachable(
        "postgresql://user:password@127.0.0.1:5432/postgres",
        async () => {
          attempts += 1;
          if (attempts < 3) {
            throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
              code: "ECONNREFUSED",
            });
          }
        },
        { retries: 3, retryDelayMs: 0 },
      ),
    ).resolves.toBeUndefined();

    expect(attempts).toBe(3);
  });
});
