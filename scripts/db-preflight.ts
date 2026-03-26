import { connect } from "node:net";

type ReachabilityCheck = (url: string) => Promise<void>;

type PreflightOptions = {
  retries?: number;
  retryDelayMs?: number;
};

function parseDbAddress(urlString: string) {
  const url = new URL(urlString);
  const host = url.hostname || "127.0.0.1";
  const port = Number(url.port || "5432");

  return { host, port };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultReachabilityCheck(urlString: string) {
  const { host, port } = parseDbAddress(urlString);

  await new Promise<void>((resolve, reject) => {
    const socket = connect({ host, port });

    const finish = (callback: () => void) => {
      socket.removeAllListeners();
      socket.destroy();
      callback();
    };

    socket.setTimeout(2_000);
    socket.once("connect", () => finish(resolve));
    socket.once("timeout", () => finish(() => reject(new Error(`connect ETIMEDOUT ${host}:${port}`))));
    socket.once("error", (error) => finish(() => reject(error)));
  });
}

export async function ensureUpstreamDbReachable(
  urlString: string,
  reachabilityCheck: ReachabilityCheck = defaultReachabilityCheck,
  { retries = 15, retryDelayMs = 1_000 }: PreflightOptions = {},
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await reachabilityCheck(urlString);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs);
      }
    }
  }

  const { host, port } = parseDbAddress(urlString);
  const originalMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    [
      `Postgres is not reachable at ${host}:${port} from ZERO_UPSTREAM_DB.`,
      "Start Postgres with `bun run dev:db-up` or use `bun run dev:all`.",
      `Original error: ${originalMessage}`,
    ].join("\n"),
  );
}

if (import.meta.main) {
  const upstreamDb = process.env.ZERO_UPSTREAM_DB;

  if (!upstreamDb) {
    console.error("ZERO_UPSTREAM_DB is required for local dev.");
    process.exit(1);
  }

  try {
    await ensureUpstreamDbReachable(upstreamDb);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
