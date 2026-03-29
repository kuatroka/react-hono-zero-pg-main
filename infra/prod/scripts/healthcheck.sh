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

curl -fsS "http://${APP_BIND_HOST}:${APP_BIND_PORT}/healthz" >/dev/null
curl -fsS "http://${ZERO_BIND_HOST}:${ZERO_BIND_PORT}/keepalive" >/dev/null

compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
  < "$REPO_ROOT/infra/prod/sql/verify-zero-readiness.sql" >/dev/null

if [[ "${CHECK_PUBLIC_ENDPOINTS:-0}" == "1" ]]; then
  curl -fsS "${APP_PUBLIC_URL}/healthz" >/dev/null
  curl -fsS "${ZERO_PUBLIC_URL}/keepalive" >/dev/null
fi

echo "Production health checks passed."

