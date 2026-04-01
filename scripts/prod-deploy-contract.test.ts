import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.join(import.meta.dir, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("production deploy contracts", () => {
  test("GitHub deploy workflow falls back to the repo-local .env.prod when the external env file is absent", () => {
    const workflow = readProjectFile(".github/workflows/deploy.yml");

    expect(workflow).toContain('PROD_ENV_FILE="${PROD_ENV_FILE:-/etc/fintellectus/react-hono-zero-pg-main.env}"');
    expect(workflow).toContain('FALLBACK_ENV_FILE="$APP_DIR/.env.prod"');
    expect(workflow).toContain('if [ ! -f "$PROD_ENV_FILE" ] && [ -f "$FALLBACK_ENV_FILE" ]; then');
    expect(workflow).toContain('PROD_ENV_FILE="$FALLBACK_ENV_FILE"');
  });

  test("prod deploy script treats sudo as optional and skips caddy reload when passwordless sudo is unavailable", () => {
    const deployScript = readProjectFile("infra/prod/scripts/deploy.sh");

    expect(deployScript).not.toContain("required_commands=(git docker curl sudo)");
    expect(deployScript).toContain("required_commands=(git docker curl)");
    expect(deployScript).toContain('if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then');
    expect(deployScript).toContain('sudo systemctl reload caddy');
    expect(deployScript).toContain('Skipping Caddy reload because passwordless sudo is unavailable.');
  });

  test("postgres bootstrap skips the heavy zero-sync repair migration once both serving tables already have primary keys", () => {
    const bootstrapScript = readProjectFile("infra/prod/scripts/apply-postgres-bootstrap.sh");

    expect(bootstrapScript).toContain("should_skip_investor_activity_zero_sync_migration()");
    expect(bootstrapScript).toContain("serving.cusip_quarter_investor_activity");
    expect(bootstrapScript).toContain("serving.cusip_quarter_investor_activity_detail");
    expect(bootstrapScript).toContain('Skipping 0010_enable_investor_activity_zero_sync.sql because serving investor activity tables are already Zero-ready.');
    expect(bootstrapScript).toContain('if [[ "$(basename "$sql_file")" == "0010_enable_investor_activity_zero_sync.sql" ]] && should_skip_investor_activity_zero_sync_migration; then');
  });
});
