#!/usr/bin/env bash
# Pull a pre-built GHCR image and restart ONLY etkan-prod-web.
# Does NOT touch: staging compose, Caddy, or either Supabase CLI stack.
# Does NOT compile on the VPS (no docker compose --build).
#
# Required env from Actions:
#   ETKAN_WEB_IMAGE  e.g. ghcr.io/sweidweb2/etkan-ms:prod-<sha>
#   GH_TOKEN         GitHub token with packages:read (GITHUB_TOKEN from Actions)
#   GHCR_USER        GitHub username for docker login (repo owner / actor)
set -euo pipefail

ROOT="${ETKAN_ROOT:-$HOME/etkan_ms}"
cd "$ROOT"

if [[ ! -f .env.production ]]; then
  echo "Missing $ROOT/.env.production on the VPS. Create it once; Actions will not overwrite it." >&2
  exit 1
fi

if [[ -z "${ETKAN_WEB_IMAGE:-}" ]]; then
  echo "Missing ETKAN_WEB_IMAGE (GHCR tag built in Actions)." >&2
  exit 1
fi

if [[ -z "${GH_TOKEN:-}" || -z "${GHCR_USER:-}" ]]; then
  echo "Missing GH_TOKEN or GHCR_USER for ghcr.io login." >&2
  exit 1
fi

# Refuse accidental staging env / wrong API host.
if grep -qE '^NEXT_PUBLIC_SUPABASE_URL=.*api\.etkan\.org' .env.production; then
  echo "Refusing deploy: .env.production points at staging API (api.etkan.org)." >&2
  exit 1
fi
if ! grep -qE '^NEXT_PUBLIC_SUPABASE_URL=https://prod-api\.etkan\.org' .env.production; then
  echo "Refusing deploy: .env.production must set NEXT_PUBLIC_SUPABASE_URL=https://prod-api.etkan.org" >&2
  exit 1
fi

echo "Logging into ghcr.io as ${GHCR_USER}"
echo "${GH_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin

echo "Pulling ${ETKAN_WEB_IMAGE}"
docker pull "${ETKAN_WEB_IMAGE}"

echo "Restarting production Next only (etkan-prod-web :3000) — no build on VPS"

docker compose \
  --project-name etkan-prod \
  --env-file .env.production \
  -f compose.yaml \
  -f compose.prod.yaml \
  up -d --no-build

docker compose \
  --project-name etkan-prod \
  --env-file .env.production \
  -f compose.yaml \
  -f compose.prod.yaml \
  ps

if ! docker ps --format '{{.Names}}' | grep -qx 'etkan-prod-web'; then
  echo "etkan-prod-web is not running after deploy." >&2
  docker logs etkan-prod-web --tail 40 >&2 || true
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx 'etkan-staging-web'; then
  echo "OK: etkan-staging-web still present (not touched by this script)."
fi

code="000"
for _ in $(seq 1 20); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000 || true)"
  echo "prod local health HTTP $code"
  if [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]]; then
    echo "Production deploy healthy on :3000 (image ${ETKAN_WEB_IMAGE})."
    exit 0
  fi
  sleep 2
done

echo "Production container did not return 200/307/308 on :3000" >&2
docker logs etkan-prod-web --tail 40 >&2 || true
exit 1
