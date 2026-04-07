import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("serving Zero-sync schema contract", () => {
  test("drizzle migration chain itself owns the investor activity zero-sync key requirements", () => {
    const journal = readProjectFile("docker/migrations/meta/_journal.json");
    const activityPkMigration = readProjectFile("docker/migrations/0001_large_selene.sql");
    const detailPkMigration = readProjectFile("docker/migrations/0003_curvy_khan.sql");
    const detailEnsureMigration = readProjectFile("docker/migrations/0004_ensure_zero_sync_key.sql");
    const activityIndexMigration = readProjectFile("docker/migrations/0006_tense_living_mummy.sql");

    expect(journal).toContain('"tag": "0001_large_selene"');
    expect(journal).toContain('"tag": "0003_curvy_khan"');
    expect(journal).toContain('"tag": "0004_ensure_zero_sync_key"');
    expect(journal).toContain('"tag": "0006_tense_living_mummy"');
    expect(activityPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity" ALTER COLUMN "id" SET NOT NULL');
    expect(activityPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity" ADD PRIMARY KEY ("id")');
    expect(detailPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity_detail" ALTER COLUMN "id" SET NOT NULL');
    expect(detailPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity_detail" ADD PRIMARY KEY ("id")');
    expect(detailEnsureMigration).toContain("duplicate id values detected");
    expect(activityIndexMigration).toContain('CREATE INDEX "idx_cusip_quarter_activity_cusip_quarter"');
    expect(activityIndexMigration).toContain('CREATE INDEX "idx_cusip_quarter_activity_ticker_quarter"');
  });

  test("readiness check enforces the detail-table primary key contract", () => {
    const readiness = readProjectFile("infra/prod/sql/verify-zero-readiness.sql");

    expect(readiness).toContain("serving.cusip_quarter_investor_activity_detail is missing");
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity_detail must have a primary key for Zero sync"
    );
  });

  test("investor activity zero-sync path preserves the secondary lookup indexes needed for warm local-like chart latency", () => {
    const migration = readProjectFile("docker/migrations/0006_tense_living_mummy.sql");
    const readiness = readProjectFile("infra/prod/sql/verify-zero-readiness.sql");

    expect(migration).toContain(
      'CREATE INDEX "idx_cusip_quarter_activity_cusip_quarter" ON "cusip_quarter_investor_activity" USING btree ("cusip","quarter")'
    );
    expect(migration).toContain(
      'CREATE INDEX "idx_cusip_quarter_activity_ticker_quarter" ON "cusip_quarter_investor_activity" USING btree ("ticker","quarter")'
    );
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity must have idx_cusip_quarter_activity_cusip_quarter for Zero chart lookups"
    );
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity must have idx_cusip_quarter_activity_ticker_quarter for Zero chart lookups"
    );
  });

  test("production bootstrap no longer depends on a separate investor activity zero-sync repair sql", () => {
    const bootstrapScript = readProjectFile("infra/prod/scripts/apply-postgres-bootstrap.sh");

    expect(bootstrapScript).not.toContain("should_skip_investor_activity_zero_sync_migration");
    expect(bootstrapScript).not.toContain("enable-investor-activity-zero-sync.sql");
  });
});
