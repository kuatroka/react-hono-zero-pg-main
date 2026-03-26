#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const failures = [];

const drizzleConfig = read("drizzle.config.ts");
const schema = read("src/db/schema.ts");

if (!drizzleConfig.includes('out: "./docker/migrations"')) {
  failures.push('drizzle.config.ts must write the active migration chain to ./docker/migrations');
}

const requiredTables = [
  "user",
  "medium",
  "message",
  "counters",
  "value_quarters",
  "entities",
  "user_counters",
  "searches",
  "superinvestors",
  "assets",
  "periods",
  "cusip_quarter_investor_activity",
  "cusip_quarter_investor_activity_detail",
];

for (const tableName of requiredTables) {
  const pattern = new RegExp(`(?:table|pgTable)\\(\\s*["']${tableName}["']`, "m");
  if (!pattern.test(schema)) {
    failures.push(`src/db/schema.ts is missing canonical table definition for ${tableName}`);
  }
}

const migrationsDir = new URL("docker/migrations/", root);
if (!existsSync(migrationsDir)) {
  failures.push('docker/migrations folder is missing');
}

const journalFile = new URL("docker/migrations/meta/_journal.json", root);
if (!existsSync(journalFile)) {
  failures.push('docker/migrations/meta/_journal.json is missing');
}

if (failures.length > 0) {
  console.error('DB schema verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('DB schema layout verified.');
