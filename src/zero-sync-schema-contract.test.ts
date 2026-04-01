import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("serving Zero-sync schema contract", () => {
  test("bootstrap migration repairs both investor activity tables", () => {
    const migration = readProjectFile("docker/migrations/0010_enable_investor_activity_zero_sync.sql");

    expect(migration).toContain("serving.cusip_quarter_investor_activity");
    expect(migration).toContain("serving.cusip_quarter_investor_activity_detail");
    expect(migration).toContain(
      "Cannot enable Zero sync for serving.cusip_quarter_investor_activity_detail: id contains NULL values"
    );
    expect(migration).toContain(
      "ALTER TABLE serving.cusip_quarter_investor_activity_detail ALTER COLUMN id SET NOT NULL"
    );
    expect(migration).toContain(
      "ALTER TABLE serving.cusip_quarter_investor_activity_detail ADD PRIMARY KEY (id)"
    );
  });

  test("readiness check enforces the detail-table primary key contract", () => {
    const readiness = readProjectFile("infra/prod/sql/verify-zero-readiness.sql");

    expect(readiness).toContain("serving.cusip_quarter_investor_activity_detail is missing");
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity_detail must have a primary key for Zero sync"
    );
  });

  test("investor activity zero-sync path preserves the secondary lookup indexes needed for warm local-like chart latency", () => {
    const migration = readProjectFile("docker/migrations/0010_enable_investor_activity_zero_sync.sql");
    const readiness = readProjectFile("infra/prod/sql/verify-zero-readiness.sql");

    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_cusip_quarter_activity_cusip_quarter ON serving.cusip_quarter_investor_activity (cusip, quarter)"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_cusip_quarter_activity_ticker_quarter ON serving.cusip_quarter_investor_activity (ticker, quarter)"
    );
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity must have idx_cusip_quarter_activity_cusip_quarter for Zero chart lookups"
    );
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity must have idx_cusip_quarter_activity_ticker_quarter for Zero chart lookups"
    );
  });

  test("investor activity migration skips redundant id scans once the serving table already has a primary key", () => {
    const migration = readProjectFile("docker/migrations/0010_enable_investor_activity_zero_sync.sql");

    expect(migration).toContain("has_activity_primary_key boolean");
    expect(migration).toContain("SELECT EXISTS (");
    expect(migration).toContain("INTO has_activity_primary_key");
    expect(migration).toContain("IF NOT has_activity_primary_key THEN");
    expect(migration).not.toContain("FROM serving.cusip_quarter_investor_activity\n      WHERE id IS NULL");
    expect(migration).not.toContain("FROM serving.cusip_quarter_investor_activity\n      GROUP BY id");
  });
});
