import { describe, expect, test } from "bun:test";
import {
  extractReplicationEvents,
  isReplicationComplete,
  latestReplicationEvent,
  parseArgs,
} from "./benchmark-zero-rebuild";

describe("benchmark-zero-rebuild", () => {
  test("parseArgs provides dev defaults", () => {
    const options = parseArgs([], {
      ZERO_REPLICA_FILE: '"/tmp/demo.db"',
    });

    expect(options.profile).toBe("dev");
    expect(options.startCommand).toBe("bun run dev:zero-cache");
    expect(options.resetCommand).toBe("bun run zero:reset");
    expect(options.replicaFile).toBe("/tmp/demo.db");
    expect(options.logPath).toContain(".tmp/zero-benchmarks/dev-");
  });

  test("parseArgs supports prod-style overrides", () => {
    const options = parseArgs([
      "--profile", "prod",
      "--start-command", "zero-cache --app-publications zapp_app",
      "--reset-command", "rm -f /srv/zero/replica.db",
      "--replica-file", "/srv/zero/replica.db",
      "--output", ".tmp/result.json",
      "--query-url", "https://example.com/statz",
      "--ready-path", "/healthz",
    ]);

    expect(options.profile).toBe("prod");
    expect(options.startCommand).toBe("zero-cache --app-publications zapp_app");
    expect(options.resetCommand).toBe("rm -f /srv/zero/replica.db");
    expect(options.replicaFile).toBe("/srv/zero/replica.db");
    expect(options.outputPath).toContain(".tmp/result.json");
    expect(options.queryUrl).toBe("https://example.com/statz");
    expect(options.readyPath).toBe("/healthz");
  });

  test("extracts and evaluates replication status events", () => {
    const log = [
      `2026-04-11 ZeroEvent: zero/events/status/replication/v1 ${JSON.stringify({
        type: "zero/events/status/replication/v1",
        status: "OK",
        stage: "Initializing",
        state: {
          replicaSize: 128,
          downloadStatus: [
            { table: "serving.assets", rows: 10, totalRows: 100 },
          ],
        },
      })}`,
      `2026-04-11 ZeroEvent: zero/events/status/replication/v1 ${JSON.stringify({
        type: "zero/events/status/replication/v1",
        status: "OK",
        stage: "Initializing",
        state: {
          replicaSize: 256,
          downloadStatus: [
            { table: "serving.assets", rows: 100, totalRows: 100 },
            { table: "serving.detail", rows: 50, totalRows: 50 },
          ],
        },
      })}`,
    ].join("\n");

    const events = extractReplicationEvents(log);
    expect(events).toHaveLength(2);

    const latest = latestReplicationEvent(log);
    expect(latest?.state?.replicaSize).toBe(256);
    expect(isReplicationComplete(latest)).toBe(true);
    expect(isReplicationComplete(events[0] ?? null)).toBe(false);
  });
});
