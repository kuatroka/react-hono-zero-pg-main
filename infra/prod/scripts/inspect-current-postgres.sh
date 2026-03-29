#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="${1:-${PROD_ENV_FILE:-$REPO_ROOT/infra/prod/.env.example}}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

echo "Containers matching postgres / mooncake:"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -E 'postgres|pg_mooncake' || true

container_name="${POSTGRES_CONTAINER_NAME:-sec_postgres_18}"

if ! docker inspect "$container_name" >/dev/null 2>&1; then
  echo "Container $container_name is not running or not inspectable." >&2
  exit 0
fi

echo
echo "Inspecting $container_name"
docker inspect "$container_name" --format '{{json .Mounts}}'

echo
echo "Image:"
docker inspect "$container_name" --format '{{.Config.Image}}'

echo
echo "Ports:"
docker inspect "$container_name" --format '{{json .NetworkSettings.Ports}}'

if [[ -n "${POSTGRES_USER:-}" && -n "${POSTGRES_DB:-}" ]]; then
  echo
  echo "Database checks:"
  docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
SHOW wal_level;
SELECT extname
FROM pg_extension
WHERE extname IN ('pg_duckdb', 'pg_mooncake')
ORDER BY extname;
SELECT pubname
FROM pg_publication
WHERE pubname = 'zapp_app';
SQL
fi

