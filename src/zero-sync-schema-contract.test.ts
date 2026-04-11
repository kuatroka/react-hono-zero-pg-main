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
    const publicationMigration = readProjectFile("docker/migrations/0009_create_zero_app_publication.sql");
    const dropDetailLookupIndexesMigration = readProjectFile("docker/migrations/0011_drop_detail_lookup_indexes.sql");
    const drilldownRangeMigration = readProjectFile("docker/migrations/0012_backfill_detail_id_ranges.sql");
    const zeroDrilldownCacheMigration = readProjectFile("docker/migrations/0013_create_zero_drilldown_cache.sql");
    const detailPublicationMigration = readProjectFile("docker/migrations/0014_add_detail_table_to_zero_publication.sql");

    expect(journal).toContain('"tag": "0001_large_selene"');
    expect(journal).toContain('"tag": "0003_curvy_khan"');
    expect(journal).toContain('"tag": "0004_ensure_zero_sync_key"');
    expect(journal).toContain('"tag": "0006_tense_living_mummy"');
    expect(journal).toContain('"tag": "0010_fast_drilldown_lookup"');
    expect(journal).toContain('"tag": "0011_drop_detail_lookup_indexes"');
    expect(activityPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity" ALTER COLUMN "id" SET NOT NULL');
    expect(activityPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity" ADD PRIMARY KEY ("id")');
    expect(detailPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity_detail" ALTER COLUMN "id" SET NOT NULL');
    expect(detailPkMigration).toContain('ALTER TABLE "cusip_quarter_investor_activity_detail" ADD PRIMARY KEY ("id")');
    expect(detailEnsureMigration).toContain("duplicate id values detected");
    expect(activityIndexMigration).toContain('CREATE INDEX "idx_cusip_quarter_activity_cusip_quarter"');
    expect(activityIndexMigration).toContain('CREATE INDEX "idx_cusip_quarter_activity_ticker_quarter"');
    expect(publicationMigration).not.toContain("serving.cusip_quarter_investor_activity_detail");
    expect(dropDetailLookupIndexesMigration).toContain('DROP INDEX IF EXISTS "serving"."idx_cqia_detail_open_lookup"');
    expect(dropDetailLookupIndexesMigration).toContain('DROP INDEX IF EXISTS "serving"."idx_cqia_detail_close_lookup"');
    expect(journal).toContain('"tag": "0012_backfill_detail_id_ranges"');
    expect(journal).toContain('"tag": "0013_create_zero_drilldown_cache"');
    expect(journal).toContain('"tag": "0014_add_detail_table_to_zero_publication"');
    expect(drilldownRangeMigration).toContain('ADD COLUMN IF NOT EXISTS "min_detail_id" bigint');
    expect(drilldownRangeMigration).toContain('ADD COLUMN IF NOT EXISTS "max_detail_id" bigint');
    expect(zeroDrilldownCacheMigration).toContain('CREATE TABLE IF NOT EXISTS "serving"."asset_investor_activity_drilldown_zero"');
    expect(zeroDrilldownCacheMigration).toContain('CREATE TABLE IF NOT EXISTS "serving"."asset_investor_activity_drilldown_hydration"');
    expect(zeroDrilldownCacheMigration).toContain("ALTER PUBLICATION zapp_app ADD TABLE serving.asset_investor_activity_drilldown_zero");
    expect(zeroDrilldownCacheMigration).toContain("ALTER PUBLICATION zapp_app ADD TABLE serving.asset_investor_activity_drilldown_hydration");
    expect(detailPublicationMigration).toContain("ALTER PUBLICATION zapp_app ADD TABLE serving.cusip_quarter_investor_activity_detail");
  });

  test("readiness check enforces the detail-table primary key contract", () => {
    const readiness = readProjectFile("infra/prod/sql/verify-zero-readiness.sql");

    expect(readiness).toContain("serving.cusip_quarter_investor_activity_detail is missing");
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity_detail must have a primary key for Zero sync"
    );
    expect(readiness).toContain("serving.asset_investor_activity_drilldown_zero is missing");
    expect(readiness).toContain(
      "serving.asset_investor_activity_drilldown_zero must have a primary key for Zero sync"
    );
    expect(readiness).toContain("serving.asset_investor_activity_drilldown_hydration is missing");
    expect(readiness).toContain(
      "serving.asset_investor_activity_drilldown_hydration must have a primary key for Zero sync"
    );
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity must expose min_detail_id for drilldown id-range lookups"
    );
    expect(readiness).toContain(
      "serving.cusip_quarter_investor_activity must expose max_detail_id for drilldown id-range lookups"
    );
  });

  test("investor activity zero-sync path keeps aggregate-table indexes while direct detail sync relies on the detail primary key", () => {
    const migration = readProjectFile("docker/migrations/0006_tense_living_mummy.sql");
    const dropDetailLookupIndexesMigration = readProjectFile("docker/migrations/0011_drop_detail_lookup_indexes.sql");
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
    expect(dropDetailLookupIndexesMigration).toContain('DROP INDEX IF EXISTS "serving"."idx_cqia_detail_open_lookup"');
    expect(dropDetailLookupIndexesMigration).toContain('DROP INDEX IF EXISTS "serving"."idx_cqia_detail_close_lookup"');
    expect(readiness).toContain("publication zapp_app is missing serving.cusip_quarter_investor_activity_detail");
    expect(readiness).not.toContain("idx_cqia_detail_open_lookup");
    expect(readiness).not.toContain("idx_cqia_detail_close_lookup");
    expect(readiness).toContain("publication zapp_app is missing serving.asset_investor_activity_drilldown_zero");
    expect(readiness).toContain("publication zapp_app is missing serving.asset_investor_activity_drilldown_hydration");
  });

  test("production bootstrap no longer depends on a separate investor activity zero-sync repair sql", () => {
    const bootstrapScript = readProjectFile("infra/prod/scripts/apply-postgres-bootstrap.sh");

    expect(bootstrapScript).not.toContain("should_skip_investor_activity_zero_sync_migration");
    expect(bootstrapScript).not.toContain("enable-investor-activity-zero-sync.sql");
  });
});
