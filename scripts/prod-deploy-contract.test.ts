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
    expect(deployScript).toContain("git reset --hard HEAD");
    expect(deployScript).toContain('if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then');
    expect(deployScript).toContain('if sudo systemctl reload caddy 2>/dev/null; then');
    expect(deployScript).toContain('Skipping Caddy reload because caddy.service is unavailable or not loaded.');
    expect(deployScript).toContain('Skipping Caddy reload because passwordless sudo is unavailable.');
  });

  test("postgres bootstrap skips the heavy zero-sync repair migration only after investor activity tables and lookup indexes are Zero-ready", () => {
    const bootstrapScript = readProjectFile("infra/prod/scripts/apply-postgres-bootstrap.sh");

    expect(bootstrapScript).toContain('compose run --rm --no-deps app "$@"');
    expect(bootstrapScript).toContain("app_exec bun run db:migrate");
    expect(bootstrapScript).toContain("app_exec bun run db:seed");
    expect(bootstrapScript).toContain('psql_exec < "$REPO_ROOT/infra/prod/sql/verify-zero-readiness.sql"');
    expect(bootstrapScript).not.toContain("enable-investor-activity-zero-sync.sql");
    expect(bootstrapScript).not.toContain("should_skip_investor_activity_zero_sync_migration");
  });

  test("production compose keeps initdb focused on extension setup instead of replaying schema sql", () => {
    const compose = readProjectFile("infra/prod/docker-compose.yml");

    expect(compose).toContain("../../docker/init/01-setup-extensions.sql:/docker-entrypoint-initdb.d/01-setup-extensions.sql:ro");
    expect(compose).not.toContain("/docker-entrypoint-initdb.d/02-seed.sql");
    expect(compose).not.toContain("/docker-entrypoint-initdb.d/15-create-zero-publication.sql");
    expect(compose).not.toContain("../../docker/migrations/0008_move_shared_tables_to_namespaces.sql");
  });
});
