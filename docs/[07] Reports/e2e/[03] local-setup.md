# E2E local setup (Phase 0+)

Run Playwright against your **already running** app. Local Supabase is Docker; Next may be host or Docker.

## Prerequisites

1. Docker Desktop running (needed for local Supabase).
2. Local Supabase up:

```powershell
npx supabase start
```

3. Seed accounts used by Phase 1+ (at least once):

```powershell
npm run seed:rbac
npm run seed:admin
npm run seed:manager
npm run seed:demo
```

4. App reachable on port **3000** — pick **one**:

**A — Host Next (recommended daily workflow)**

```powershell
npm run dev
```

**B — Next in Docker** (`compose.local.yaml`)

```powershell
docker compose --env-file .env.local -f compose.yaml -f compose.local.yaml up --build
```

Then always set `E2E_SKIP_WEBSERVER=1` so Playwright does not also start `npm run dev`.

5. **Maintenance mode OFF** in app settings (auth E2E cannot log in while it is on).

## One-time install

```powershell
npm install
npx playwright install chromium
```

## Env

Copy into `.env.local` (never commit passwords). Playwright loads `.env.local` automatically.

```env
# Default if unset: http://127.0.0.1:3000
E2E_BASE_URL=http://127.0.0.1:3000

# Required when Next already runs in Docker (or you always start the app yourself)
E2E_SKIP_WEBSERVER=1

# Optional overrides (seed-script defaults used when unset)
# E2E_MANAGER_EMAIL=
# E2E_MANAGER_PASSWORD=
# E2E_TEACHER_EMAIL=demo.teacher.math@example.com
# E2E_TEACHER_PASSWORD=Demo123!
# E2E_STUDENT_EMAIL=demo.student.alice@example.com
# E2E_STUDENT_PASSWORD=Demo123!

# Optional Phase 2 invite tokens
# E2E_GUEST_TOKEN=
# E2E_FINANCIAL_TOKEN=
```

### Docker networking cheat sheet

| Where Playwright runs | Where Next runs | `E2E_BASE_URL` | `E2E_SKIP_WEBSERVER` |
|-----------------------|-----------------|----------------|----------------------|
| Host | Host `npm run dev` | `http://127.0.0.1:3000` | unset (reuses server) |
| Host | Docker `etkan-local-web` :3000 | `http://127.0.0.1:3000` | `1` |
| Docker container | Host Next | `http://host.docker.internal:3000` | `1` |
| Docker container | Compose service `web` | `http://web:3000` | `1` |

Do **not** point E2E at production (`etkan.org`) or staging for destructive suites.

## Commands

```powershell
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:ui
npm run test:e2e:headed
```

Auth setup writes `e2e/.auth/*.json` (gitignored). Re-run anytime credentials change.

Phase 1–2 only:

```powershell
npx playwright test e2e/auth e2e/public
```

With Docker Next already up:

```powershell
$env:E2E_SKIP_WEBSERVER="1"; npm run test:e2e
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Error: connect ECONNREFUSED 127.0.0.1:3000` | Start `npm run dev` or the local web container first |
| Playwright starts a second Next and port conflicts | Set `E2E_SKIP_WEBSERVER=1` |
| Setup fails for manager/teacher/student | Run seed scripts; set `E2E_*` if your passwords differ |
| `Invalid email or password` on valid user | Maintenance mode on, or wrong seed password |
| Home smoke fails / blank | Confirm Supabase is up and `.env.local` has valid anon URL/keys |
| Browser missing | `npx playwright install chromium` |

## Related

- Plan: [`[01] e2e-testing-plan.md`](./[01]%20e2e-testing-plan.md)
- Checklist: [`[02] phase-checklist.md`](./[02]%20phase-checklist.md)
- Local Supabase: [`docs/[03] Config/local-supabase.md`](../../[03]%20Config/local-supabase.md)
- Next Docker: [`docs/[03] Config/docker.md`](../../[03]%20Config/docker.md)
