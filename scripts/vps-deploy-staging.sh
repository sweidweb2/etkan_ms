#!/usr/bin/env bash
# Pull a pre-built GHCR image and restart ONLY etkan-staging-web.
# Does NOT compile on the VPS (no docker compose --build).
#
# Required env from Actions:
#   ETKAN_WEB_IMAGE  e.g. ghcr.io/sweidweb2/etkan-ms:staging-<sha>
#   GH_TOKEN         GitHub token with packages:read
#   GHCR_USER        GitHub username for docker login
set -euo pipefail

ROOT="${ETKAN_ROOT:-$HOME/etkan_ms}"
cd "$ROOT"

if [[ ! -f .env.staging ]]; then
  echo "Missing $ROOT/.env.staging on the VPS. Create it once; Actions will not overwrite it." >&2
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

bash scripts/vps-patch-supabase-auth.sh

echo "Logging into ghcr.io as ${GHCR_USER}"
echo "${GH_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin

echo "Pulling ${ETKAN_WEB_IMAGE}"
docker pull "${ETKAN_WEB_IMAGE}"

echo "Restarting staging Next only (etkan-staging-web :3001) — no build on VPS"

docker compose \
  --project-name etkan-staging \
  --env-file .env.staging \
  -f compose.yaml \
  -f compose.staging.yaml \
  up -d --no-build

docker compose \
  --project-name etkan-staging \
  --env-file .env.staging \
  -f compose.yaml \
  -f compose.staging.yaml \
  ps

code="000"
for _ in $(seq 1 20); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3001 || true)"
  echo "staging local health HTTP $code"
  if [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]]; then
    echo "Staging deploy healthy on :3001 (image ${ETKAN_WEB_IMAGE})."
    exit 0
  fi
  sleep 2
done

echo "Staging container did not return 200/307/308 on :3001" >&2
docker logs etkan-staging-web --tail 40 >&2 || true
exit 1
