<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Bug fixing guidelines
- When I report a bug, don't start by trying to fix it. Instead, use red/green TDD approach. Start by writing a test that reproduces the bug. Then, try to fix the bug and prove it with a passing test.

## Testing
Review, analyse, fix and self test. When testing, use agent-browser tool. Make sure to interact with the app on different routes. Especially the one where the error is produced. Use UI components like search box (make sure they work, produce result, search works),  tables and charts are visible and with data. use red/green TDD approach. Only when originally failed tests pass and there are not server or browser console errors, then declare the issue fixed.

## Zero tables: what to remember when adding them
- Do not add a table to `src/schema.ts` unless the upstream Postgres table is already Zero-syncable.
- Every Zero-synced Postgres table must have a stable row identity: a primary key, or at minimum a non-null unique index. In practice, prefer a real primary key.
- Zero validates the whole declared client schema at connection time. One unsupported table in `src/schema.ts` can blank the whole app by triggering schema incompatibility.
- Keep Drizzle schema, Postgres migrations, and the external data-loading pipeline aligned. If a loader recreates or swaps tables, it must preserve or recreate the primary key / unique constraints that Zero relies on.
- For data imported from DuckDB / external systems, validate candidate key columns for nulls and duplicates before adding constraints.
- Do not rely on foreign tables, views, or materialized views for direct Zero sync. Materialize into a normal Postgres base table first, then add the key/index Zero requires.
- UI startup must stay visible even if Zero is slow or unavailable. Never hide the whole app behind a route-level readiness gate.