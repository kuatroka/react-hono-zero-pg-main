#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="${1:-${PROD_ENV_FILE:-$REPO_ROOT/infra/prod/.env.example}}"
TEMPLATE_PATH="${TEMPLATE_PATH:-$REPO_ROOT/infra/prod/Caddyfile.template}"
OUTPUT_PATH="${OUTPUT_PATH:-${CADDY_SITE_PATH:-$REPO_ROOT/infra/prod/Caddyfile.rendered}}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

sed \
  -e "s|__APP_DOMAIN__|${APP_DOMAIN}|g" \
  -e "s|__ZERO_DOMAIN__|${ZERO_DOMAIN}|g" \
  -e "s|__APP_BIND_PORT__|${APP_BIND_PORT}|g" \
  -e "s|__ZERO_BIND_PORT__|${ZERO_BIND_PORT}|g" \
  "$TEMPLATE_PATH" > "$tmp_file"

if [[ "$OUTPUT_PATH" == "$REPO_ROOT/infra/prod/Caddyfile.rendered" ]]; then
  install -m 0644 "$tmp_file" "$OUTPUT_PATH"
else
  sudo install -m 0644 "$tmp_file" "$OUTPUT_PATH"
fi

echo "Rendered Caddy config to $OUTPUT_PATH"

