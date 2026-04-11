import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { spawn } from "node:child_process";

type DownloadStatus = {
  table: string;
  rows: number;
  totalRows: number;
  totalBytes?: number;
};

type ReplicationEvent = {
  type: string;
  status: string;
  stage: string;
  description?: string;
  time?: string;
  state?: {
    replicaSize?: number;
    downloadStatus?: DownloadStatus[];
  };
};

export type BenchmarkOptions = {
  profile: string;
  startCommand: string;
  resetCommand: string | null;
  replicaFile: string;
  timeoutMs: number;
  pollMs: number;
  sampleMs: number;
  startupGraceMs: number;
  outputPath: string | null;
  logPath: string;
  queryUrl: string | null;
  readyPath: string;
};

export type BenchmarkSummary = {
  profile: string;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
  elapsedSeconds: number;
  resetCommand: string | null;
  startCommand: string;
  replicaFile: string;
  replicaBytes: number;
  replicaSizeMB: number;
  logPath: string;
  queryUrl: string | null;
  readyPath: string;
  firstReadyQueryMs: number | null;
  lastReplicationEvent: ReplicationEvent | null;
  copiedTables: Array<{
    table: string;
    rows: number;
    totalRows: number;
    completionRatio: number;
  }>;
};

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseArgs(argv: string[], env = process.env): BenchmarkOptions {
  const argMap = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags.add(token);
      continue;
    }
    argMap.set(token, next);
    index += 1;
  }

  const profile = argMap.get("--profile") ?? "dev";
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const tmpDir = resolve(process.cwd(), ".tmp", "zero-benchmarks");
  const replicaFile = stripQuotes(
    argMap.get("--replica-file")
      ?? env.ZERO_REPLICA_FILE
      ?? "/tmp/hello_zero_replica.db",
  );
  const startCommand =
    argMap.get("--start-command")
    ?? (profile === "dev"
      ? "bun run dev:zero-cache"
      : "bunx zero-cache --app-publications zapp_app");
  const resetCommand = flags.has("--skip-reset")
    ? null
    : (argMap.get("--reset-command")
      ?? (profile === "dev" ? "bun run zero:reset" : null));

  mkdirSync(tmpDir, { recursive: true });

  return {
    profile,
    startCommand,
    resetCommand,
    replicaFile,
    timeoutMs: parseInteger(argMap.get("--timeout-ms"), 60 * 60 * 1000),
    pollMs: parseInteger(argMap.get("--poll-ms"), 2_000),
    sampleMs: parseInteger(argMap.get("--sample-ms"), 5_000),
    startupGraceMs: parseInteger(argMap.get("--startup-grace-ms"), 5_000),
    outputPath: argMap.get("--output") ? resolve(process.cwd(), argMap.get("--output")!) : null,
    logPath: resolve(process.cwd(), argMap.get("--log-path") ?? join(".tmp", "zero-benchmarks", `${profile}-${timestamp}.log`)),
    queryUrl: argMap.get("--query-url") ?? null,
    readyPath: argMap.get("--ready-path") ?? "/",
  };
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, "");
}

export function safeReplicaBytes(replicaFile: string) {
  try {
    return statSync(replicaFile).size;
  } catch {
    return 0;
  }
}

export function extractReplicationEvents(logText: string) {
  return logText
    .split("\n")
    .flatMap((line) => {
      const marker = "ZeroEvent: zero/events/status/replication/v1 ";
      const markerIndex = line.indexOf(marker);
      if (markerIndex < 0) {
        return [];
      }

      const payload = line.slice(markerIndex + marker.length);
      try {
        return [JSON.parse(payload) as ReplicationEvent];
      } catch {
        return [];
      }
    });
}

export function latestReplicationEvent(logText: string) {
  const events = extractReplicationEvents(logText);
  return events.at(-1) ?? null;
}

export function isReplicationComplete(event: ReplicationEvent | null) {
  if (!event?.state?.downloadStatus?.length) {
    return false;
  }

  return event.state.downloadStatus.every((table) => table.rows >= table.totalRows);
}

async function maybeMeasureReadyQuery(baseUrl: string | null, readyPath: string, startedAtMs: number) {
  if (!baseUrl) {
    return null;
  }

  const target = new URL(readyPath, baseUrl).toString();
  try {
    const response = await fetch(target, { method: "GET" });
    if (!response.ok) {
      return null;
    }
    return Date.now() - startedAtMs;
  } catch {
    return null;
  }
}

async function runShellCommand(command: string) {
  const proc = spawn(command, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    stdio: "inherit",
  });

  const exitCode = await new Promise<number>((resolvePromise, reject) => {
    proc.on("error", reject);
    proc.on("exit", (code) => resolvePromise(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`Command failed (${exitCode}): ${command}`);
  }
}

async function benchmark(options: BenchmarkOptions): Promise<BenchmarkSummary> {
  mkdirSync(dirname(options.logPath), { recursive: true });
  writeFileSync(options.logPath, "");

  if (options.resetCommand) {
    await runShellCommand(options.resetCommand);
  }

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const child = spawn(options.startCommand, {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.unref();
  child.stdout?.on("data", (chunk) => {
    writeFileSync(options.logPath, chunk, { flag: "a" });
  });
  child.stderr?.on("data", (chunk) => {
    writeFileSync(options.logPath, chunk, { flag: "a" });
  });

  let firstReadyQueryMs: number | null = null;

  try {
    await sleep(options.startupGraceMs);

    while (Date.now() - startedAtMs <= options.timeoutMs) {
      const logText = readFileSync(options.logPath, "utf8");
      const event = latestReplicationEvent(logText);

      if (firstReadyQueryMs == null) {
        firstReadyQueryMs = await maybeMeasureReadyQuery(options.queryUrl, options.readyPath, startedAtMs);
      }

      if (isReplicationComplete(event)) {
        const finishedAtMs = Date.now();
        const finishedAt = new Date(finishedAtMs).toISOString();
        const replicaBytes = safeReplicaBytes(options.replicaFile);
        return {
          profile: options.profile,
          startedAt,
          finishedAt,
          elapsedMs: finishedAtMs - startedAtMs,
          elapsedSeconds: Number(((finishedAtMs - startedAtMs) / 1000).toFixed(2)),
          resetCommand: options.resetCommand,
          startCommand: options.startCommand,
          replicaFile: options.replicaFile,
          replicaBytes,
          replicaSizeMB: Number((replicaBytes / (1024 * 1024)).toFixed(2)),
          logPath: options.logPath,
          queryUrl: options.queryUrl,
          readyPath: options.readyPath,
          firstReadyQueryMs,
          lastReplicationEvent: event,
          copiedTables: (event?.state?.downloadStatus ?? []).map((table) => ({
            table: table.table,
            rows: table.rows,
            totalRows: table.totalRows,
            completionRatio: table.totalRows > 0 ? Number((table.rows / table.totalRows).toFixed(4)) : 1,
          })),
        };
      }

      await sleep(options.pollMs);
    }
  } finally {
    try {
      process.kill(-child.pid!, "SIGTERM");
    } catch {
      // noop
    }
  }

  throw new Error(`Timed out waiting for Zero rebuild completion after ${options.timeoutMs}ms`);
}

if (import.meta.main) {
  const options = parseArgs(process.argv.slice(2));
  const summary = await benchmark(options);
  const json = JSON.stringify(summary, null, 2);
  console.log(json);

  if (options.outputPath) {
    mkdirSync(dirname(options.outputPath), { recursive: true });
    writeFileSync(options.outputPath, `${json}\n`);
  }
}
