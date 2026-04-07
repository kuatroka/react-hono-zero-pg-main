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
  compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" "$@"
}

app_exec() {
  compose run --rm --no-deps app "$@"
}

echo "Applying Drizzle schema migrations via app container"
app_exec bun run db:migrate

echo "Seeding idempotent app bootstrap data via app container"
app_exec bun run db:seed

echo "Verifying Zero readiness against shared Postgres"
psql_exec < "$REPO_ROOT/infra/prod/sql/verify-zero-readiness.sql"
