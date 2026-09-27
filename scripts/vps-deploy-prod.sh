#!/usr/bin/env bash
set -euo pipefail

ROOT="${ETKAN_ROOT:-$HOME/etkan_ms}"
cd "$ROOT"

if [[ ! -f .env.production ]]; then
  echo "Missing $ROOT/.env.production on the VPS. Create it once; Actions will not overwrite it." >&2
  exit 1
fi

docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml up -d --build
docker compose --env-file .env.production -f compose.yaml -f compose.prod.yaml ps

code="000"
for _ in $(seq 1 20); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000 || true)"
  echo "prod local health HTTP $code"
  if [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]]; then
    exit 0
  fi
  sleep 2
done

echo "Production container did not return 200/307/308 on :3000" >&2
docker logs etkan-prod-web --tail 40 >&2 || true
exit 1
