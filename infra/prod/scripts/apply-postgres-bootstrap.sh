#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/infra/prod/docker-compose.yml}"
ENV_FILE="${1:-${PROD_ENV_FILE:-$REPO_ROOT/infra/prod/.env.example}}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

psql_exec() {
  compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" --dbname "${POSTGRES_DB}"
}

should_skip_investor_activity_zero_sync_migration() {
  local readiness
  readiness="$(psql_exec -tA <<'SQL'
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = 'serving.cusip_quarter_investor_activity'::regclass
  )
   AND EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'p'
      AND conrelid = 'serving.cusip_quarter_investor_activity_detail'::regclass
  )
  THEN 'ready'
  ELSE 'repair'
END;
SQL
)"
  [[ "${readiness//$'\n'/}" == "ready" ]]
}

SQL_FILES=(
  "$REPO_ROOT/docker/init/01-setup-extensions.sql"
  "$REPO_ROOT/docker/seed.sql"
  "$REPO_ROOT/docker/migrations/08_add_drilldown_function.sql"
  "$REPO_ROOT/docker/migrations/0008_move_shared_tables_to_namespaces.sql"
  "$REPO_ROOT/docker/migrations/0009_create_zero_app_publication.sql"
  "$REPO_ROOT/docker/migrations/0010_enable_investor_activity_zero_sync.sql"
)

for sql_file in "${SQL_FILES[@]}"; do
  if [[ "$(basename "$sql_file")" == "0010_enable_investor_activity_zero_sync.sql" ]] && should_skip_investor_activity_zero_sync_migration; then
    echo "Skipping 0010_enable_investor_activity_zero_sync.sql because serving investor activity tables are already Zero-ready."
    continue
  fi

  echo "Applying $(basename "$sql_file")"
  psql_exec < "$sql_file"
done

echo "Verifying Zero readiness against shared Postgres"
psql_exec < "$REPO_ROOT/infra/prod/sql/verify-zero-readiness.sql"
