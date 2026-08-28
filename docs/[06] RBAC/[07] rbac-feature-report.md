# RBAC feature report

**Date:** 2026-07-29  
**Scope:** Phases 0–8 (definitions → DB → engine → backend → routes → frontend → RBAC Manager → hardening)  
**Automated check:** 35 related unit tests passed (`permissions`, route map, filter nav, permission-checks, require-route, authorization.service, rbac.service)

**Verdict:** The RBAC feature is implemented end-to-end and working. No blocking mistakes found. A few intentional or soft edge cases are noted at the end (not failures).

---

## What shipped

| Layer | What |
|-------|------|
| Catalog | 101 keys in `lib/constants/permissions.ts` + `[02]` (includes instructors + accounting + income statement + transactions) |
| Storage | `permissions` + `role_permissions` migration; `npm run seed:rbac` |
| Engine | `assertPermission` / `getUnauthorizedError` / `getUserPermissionsCached` |
| Backend | Manager services gate by permission + user id (no leftover manager-role bypasses) |
| Routes | `/manager/*` → required view/`rbac.manage`; deep links blocked without grant |
| Frontend | Server-filtered nav; `PermissionsProvider` + `Can` hide write controls |
| RBAC UI | System → **Permissions** (`/manager/rbac`) |
| Hardening | Admin client + mandatory service checks; no dynamic RLS; layout revalidate on save |

---

## What is working

### Catalog and seed

- Single source of truth: code catalog ↔ `[02]` (101 keys).
- Seed gives **manager** every key; **admin** backup export keys only; other roles empty until granted in UI.
- Re-run anytime: `npm run seed:rbac`.

### Authorization engine

- Load grants by profile role → `role_permissions`.
- Deny by default (missing user, unknown key, empty grants).
- Request-scoped cache; next request sees DB changes after RBAC save.

### Backend (services / actions)

- Manager domain uses admin client **after** permission checks.
- No remaining `assertManagerRole` / role-string bypasses in services.
- Spot-checked sensitive paths still gated:
  - Backup API (`BACKUP_EXPORT_*` + `BACKUP_DOWNLOAD`)
  - Settings maintenance + credentials
  - User create (`USERS_CREATE`)
  - Grades certificate / fast-certificate exports

### Route and panel access

- Role still owns panel root for most paths (teacher cannot open `/manager/users`).
- **Exception:** shared workshop paths (`/manager/workshops`, detail, `/manager/workshops/payments`) are allowlisted for any role; non-managers also need `is_instructor` + the path’s view permission.
- Sidebar **Manage workshops** (all roles) requires `is_instructor` + `workshops.view`.
- Inside manager (and shared workshop pages), path map enforces view permissions (nested class grades/sessions/tasks, equipment borrow, RBAC page, `workshops.payments.view` for payments overview).
- Unknown `/manager/...` paths fail closed (`forbidden`).
- Middleware sets `x-pathname` for the layout gate.

### Frontend

- Sidebar + search filtered on the server (no flash of forbidden items; mobile = same sidebar).
- Write triggers wrapped with `Can` across major manager features.
- Full manager with all grants behaves as before (all nav + actions visible).

### RBAC Manager UI

- Role selector + feature-grouped checkboxes.
- Cannot save a change that would leave **zero** roles with `rbac.manage`.
- Successful save: audit log on `role_permissions` + `revalidatePath(/manager, layout)`.
- Page and save action both require `rbac.manage`.

### Hardening model

- Documented in `[04]` / `[05]`: session client = identity/auth/credentials only; manager data = admin client + service asserts.
- Dynamic permission-mirrored RLS intentionally **not** used (would fight RBAC Manager grants).

---

## How to use it

1. Seed: `npm run seed:rbac` (after catalog changes).
2. Manage grants: manager panel → **System → Permissions** (`/manager/rbac`).
3. Smoke engine: `npm run smoke:authz`.
4. Manual QA: `[06] regression-checklist.md`.

---

## Edge cases / follow-ups (not blockers)

These are soft / intentional — not “broken RBAC”:

1. **`students.change_status`** — catalog key exists; status changes currently go through `students.update`. Fine if you treat them as one write; split later if you want separate grants.
2. **Dashboard shortcuts** — quick links on the dashboard are not permission-filtered in the widget; opening a denied deep link is still blocked by the route gate.
3. **Backup history fetch** — history helper itself does not re-assert `backup.view`; the page/route already requires it.
4. **`attendance.view`** — attendance UI lives under sessions; writes use `attendance.update`. View is covered by session/class access in practice.
5. **Manual regression** — `[06]` checklist items are for humans to tick; automated tests cover engine/map/RBAC safety, not every UI click path.

---

## Related docs

| Doc | Role |
|-----|------|
| `[01] rbac-layers.md` | Business layers overview |
| `[02] permission-definitions.md` | Frozen catalog |
| `[03] rbac-implementation-plan.md` | Phased plan (0–8 done) |
| `[04] service-authorization.md` | Service gate patterns |
| `[05] enforcement.md` | Session vs admin, no dynamic RLS |
| `[06] regression-checklist.md` | Manual QA |

---

## Summary

RBAC is **done and working** for the manager baseline: definitions, storage, engine, service enforcement, deep-link route gates, UI hide/show, in-app permission editing with lockout protection, and documented hardening. Remaining items are polish / optional splits, not missing security for the shipped model.
