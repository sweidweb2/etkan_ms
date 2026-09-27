#!/usr/bin/env bash
set -euo pipefail

ROOT="${ETKAN_ROOT:-$HOME/etkan_ms}"
cd "$ROOT"

if [[ ! -f .env.staging ]]; then
  echo "Missing $ROOT/.env.staging on the VPS. Create it once; Actions will not overwrite it." >&2
  exit 1
fi

docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml up -d --build
docker compose --env-file .env.staging -f compose.yaml -f compose.staging.yaml ps

code="000"
for _ in $(seq 1 20); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3001 || true)"
  echo "staging local health HTTP $code"
  if [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]]; then
    exit 0
  fi
  sleep 2
done

echo "Staging container did not return 200/307/308 on :3001" >&2
docker logs etkan-staging-web --tail 40 >&2 || true
exit 1
