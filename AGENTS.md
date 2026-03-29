
## Tech Stack and javascript runtime
- **bun** as package manager, js runtime, bundler and test runner. Never use node.js 
- **bun** rules- https://bun.com/llms-rules.txt
- bun docs - https://bun.sh/llms.txt
- Rocicorp zero sync tech - https://zero.rocicorp.dev/llms.txt
- hono - https://hono.dev/llms-full.txt
- hono - https://hono.dev/llms.txt
- Docker - https://docs.docker.com/llms.txt
- uPlot (Charting Library) - https://github.com/leeoniya/uplot
- eCharts (Charting Library) - https://github.com/apache/echarts

## Important companion codebase - sec_app
- sec_app - '/Users/yo_macbook/Documents/dev/sec_app' - this codebase contains the Dagster data pipeline that generated data and loads it to Postgres that is connected to zero sync and feeds the app. 
- main data load and DB creation script - '/Users/yo_macbook/Documents/dev/sec_app/src/sec_app/pipeline/db_creation_utils.py'
- IMPLEMENTATION_NOTES.md - '/Users/yo_macbook/Documents/dev/sec_app/IMPLEMENTATION_NOTES.md'
- Notes on VPS server - '/Users/yo_macbook/Documents/dev/sec_app/docs/VPS_DEPLOYMENT_GUIDE.md'

## DB and Drizzle
- Drizzle ORM - https://orm.drizzle.team/llms.txt
- Drizzle ORM Full - https://orm.drizzle.team/llms-full.txt

## Bug fixing, architectural changes, refactoring guidelines
- When I report a bug, architectural changes or refactoring, don't start by trying to fix it. Instead, use red/green TDD approach. Start by writing a test that reproduces the bug. Then, try to fix the bug and prove it with a passing test.

## Testing
Review, analyse, fix and self test. Use agent-browser tool to test UI. Interact with the app on different routes. Especially the one where the error is produced. Use UI components like search box (produces result list, search works and clicks navigate to correct page with no errors), tables and charts are visible and with data. Use red/green TDD approach. Declare the issue fixed only when the originally failed tests pass and there are no:
- no browser console errors in the automated browser checks
- no page errors in the automated browser checks
- no server errors in the fresh verification runs


## Which command do I run?
- Normal local development: `bun run dev`. This already runs the Zero preflight automatically through `dev:zero-cache`.
- Testing the Zero preflight logic itself: `bun run test:zero-preflight`. Use this when editing `scripts/zero-preflight.mjs` or related Zero startup behavior.
- If Zero behaves strangely locally: `bun run zero:reset`, then restart with `bun run dev`.

## Local dev ports
- `4001` for the Bun app server (SPA + API)
- `4848` for Zero cache
- `4849` for Zero change-streamer

## Zero runtime hygiene
- Zero server processes in this repo must run on a Node version supported by `@rocicorp/zero` and `@rocicorp/zero-sqlite3`. Prefer Node 24.x.
- Treat the local `ZERO_REPLICA_FILE` SQLite replica as disposable derived state, not durable app data.
- Any change to Zero package version, native sqlite package version, active Node version, or platform/arch should invalidate the local replica.
- `bun run dev:zero-cache` now runs `scripts/zero-preflight.mjs` first and may auto-delete the local replica if runtime fingerprints changed.
- Use `bun run zero:reset` when Zero behaves strangely and you want a clean local replica rebuild.

## Zero VPS Deployment
- Default this repo to a single VPS running one `zero-cache` instance. Do not plan for horizontal fan-out or multi-node routing unless the task explicitly asks for it.
- Keep `zero-cache` and its SQLite replica on persistent disk. The replica file (`ZERO_REPLICA_FILE`) is derived state and may be wiped to recover from a wedged sync; the upstream Postgres database is the source of truth.
- Use a Postgres upstream with `wal_level=logical`. `ZERO_UPSTREAM_DB` must be a direct connection, not a pooler. `ZERO_CVR_DB` and `ZERO_CHANGE_DB` may use pooled connections if needed.
- If the upstream role cannot create Zero's default publication, create the publication manually and point Zero at it with `ZERO_APP_PUBLICATIONS` / `--app-publications`. This repo already does that in local dev with `zapp_app`.
- In single-node mode, `zero-cache` runs the replication manager and change-streamer together. Expose only the client-facing sync port through the reverse proxy: `ZERO_PORT` defaults to `4848`, the internal change-streamer defaults to `port + 1` (`4849`), and the proxy must forward WebSocket upgrades to the sync port.
- Configure Zero through env vars or `zero-cache` flags, not a separate config file. Keep `ZERO_CHANGE_STREAMER_URI` unset for the default one-node setup. Set `ZERO_ADMIN_PASSWORD` in production so the inspector and `/statz` stay gated.
- Keep the browser query URL and server query allowlist identical in Zero 1.x. In this repo, `VITE_ZERO_GET_QUERIES_URL` must exactly match `ZERO_QUERY_URL`, currently `http://localhost:4001/api/zero/get-queries` in local development.
- `ZERO_LAZY_STARTUP` is single-node only and can delay the first replication connection until the first request. `ZERO_LITESTREAM_BACKUP_URL` is optional in single-node mode, but use it if you want replica backups/restores.
- Zero 1.0-era ops guidance still points to single-node as the easiest deployment shape, and updates on that shape imply downtime. If the upstream Postgres provider cannot support the required replication behavior, replication can halt and a reset may be needed after schema changes.

## Zero tables: what to remember when adding them
- Do not add a table to `src/schema.ts` unless the upstream Postgres table is already Zero-syncable.
- Every Zero-synced Postgres table must have a stable row identity: a primary key, or at minimum a non-null unique index. In practice, prefer a real primary key.
- Zero validates the whole declared client schema at connection time. One unsupported table in `src/schema.ts` can blank the whole app by triggering schema incompatibility.
- Keep Drizzle schema, Postgres migrations, and the external data-loading pipeline aligned. If a loader recreates or swaps tables, it must preserve or recreate the primary key / unique constraints that Zero relies on.
- For data imported from DuckDB / external systems, validate candidate key columns for nulls and duplicates before adding constraints.
- Do not rely on foreign tables, views, or materialized views for direct Zero sync. Materialize into a normal Postgres base table first, then add the key/index Zero requires.
- UI startup must stay visible even if Zero is slow or unavailable. Never hide the whole app behind a route-level readiness gate.
