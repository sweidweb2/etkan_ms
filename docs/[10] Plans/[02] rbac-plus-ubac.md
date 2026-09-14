# [02] RBAC + UBAC (role baseline + per-user allow/deny)

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-09-14  
**Status:** Phases A–D done — Phases E–G planned (not implemented)  
**Related docs:**  
- `docs/[06] RBAC/[01] rbac-layers.md`  
- `docs/[06] RBAC/[02] permission-definitions.md`  
- `docs/[06] RBAC/[03] rbac-implementation-plan.md`  
- `docs/[06] RBAC/[04] service-authorization.md`  
- `docs/[06] RBAC/[05] enforcement.md`  
- Schema / DBML: `docs/[05] Database/…`, `permissions`, `role_permissions`, `profiles`, `audit_logs`  
- Code today: `services/auth/authorization.service.ts`, `services/auth/rbac.service.ts`, `lib/auth/session.ts`, Manager RBAC + Users UI  

---

## Executive summary

| Change | Target behavior |
|--------|-----------------|
| Effective permissions | `(role_permissions ∪ user_allows) − user_denies` |
| Role grants | Unchanged baseline via `role_permissions` |
| User overlay | New `user_permissions` rows: allow **and** deny; may include keys the role does **not** have |
| Who manages overlays | **`profiles.role === manager` only**; managers already have full catalog access |
| Panel routing | Still by **role** (middleware / panel path). UBAC does **not** open another panel by itself |
| Enforcement | Same app-layer stance: services + route gates + `Can`. **No** permission-mirrored RLS |
| Role change | User gets new role’s grants; dialog asks whether to **keep private overlays** that are **not** already covered by the new role |
| Audit | Every user-overlay replace and role-change keep/clear decision → `audit_logs` |
| Cache | Role cache stays; shell stores **effective** keys; bust **that user** on overlay edit |

---

## Locked decisions (do not re-open without product change)

1. **Grant + deny.** User overlay supports `allow` and `deny` effects.
2. **Beyond-role allows.** A user may be allowed a permission their role does not include.
3. **No non-delegable keys.** Any catalog permission may appear on a user overlay (including `rbac.manage`). Governance is “manager role only,” not a blocked-key list.
4. **Role change + keep-private dialog.** On role change, effective role set becomes the new role’s grants. A dialog asks whether to keep **private** overlay rows. Skip asking about any private allow that is already present on the **new** role (user gets it via role anyway). Private **denies** that still matter against the new role **are** asked about (or included in the keep set). If manager chooses not to keep, hard-delete those overlay rows.
5. **Only manager role** may create/update/delete user overlays. Manager is full-access for the catalog.
6. **Audit log** required for overlay replaces and for role-change keep/clear outcomes (`recordManagerAuditLog`).
7. **Schema:** `user_permissions` with hard delete; save is a **full snapshot replace** of that user’s overlay rows; unique `(user_id, permission_key)` — no duplicates.
8. **Single resolution rule** used by session pack, route permission gates, and `assertPermission` / `getUserPermissions*`.
9. **Caches:** keep 15m role-permission cache; on overlay change clear **that user’s** session shell; on role-matrix change keep today’s global shell + role-cache clear (or equivalent “all users of that role”).
10. **Admin UX:** manage overlays from **user details + edit-user flow**; show **from role / private overlay / effective**; lockout rules for `rbac.manage` apply to effective access (role ∪ allow − deny).
11. **UBAC does not bypass panel role.** Teacher/student with extra manager-only keys still cannot enter `/manager` unless their **role** allows that panel.
12. **No dynamic / permission-mirrored RLS** for this work (same as current RBAC enforcement doc).
13. **Prefer new roles** when the same extras become common; UBAC is for exceptions.

---

## Domain rules (target)

### Effective set

```text
role_keys     = role_permissions[profiles.role]
user_allows   = user_permissions where effect = 'allow'
user_denies   = user_permissions where effect = 'deny'

effective     = (role_keys ∪ user_allows) − user_denies
```

- Deny wins over both role and user allow for the same key.
- At most one overlay row per `(user_id, permission_key)` (effect is either allow or deny, not both).

### What “private” means on role change

```text
private_allows_to_ask = user_allows − new_role_keys
private_denies_to_ask = user_denies ∩ new_role_keys
  // deny only matters if the new role would grant that key
```

- Dialog offers keep vs clear for the rows in those sets (and any other overlay rows the product chooses to treat as private leftovers, e.g. allows already in new role can be auto-dropped as redundant without asking).
- If **keep**: retain asked rows (and optionally prune redundant allows that equal new role).
- If **clear**: hard-delete the private overlay rows in scope; user then has effectively just the new role (plus any kept rows if partial keep is implemented — default is keep-all-private vs clear-all-private).

**Default UX recommendation (implement unless product changes):** one confirm with “Keep private permissions” / “Discard private permissions.” No per-key multi-select in v1.

### Panel vs permission

| Gate | Source |
|------|--------|
| Which panel URL (`/manager`, `/teacher`, …) | `profiles.role` (middleware) |
| Nav items, route `*.view`, buttons, services | **effective** permission keys |

### Who may edit overlays

| Actor | Allowed? |
|-------|----------|
| `profiles.role === manager` | Yes (full catalog) |
| Other roles, even with `rbac.manage` via role or UBAC | **No** for managing overlays (v1 lock) |
| Self-edit of own overlay | **No** |

---

## Current vs target (code)

```text
TODAY
  getUserPermissions(userId) → role_permissions[role] only
  session shell.permissionKeys = role set
  Manager RBAC UI → role_permissions only

TARGET
  getUserPermissions(userId) → merge role ∪ allow − deny
  session shell.permissionKeys = effective set
  Manager Users UI → edit user_permissions snapshot
  Manager RBAC UI → unchanged role matrix (+ note that users may have overlays)
```

---

## Implementation phases

Implement **in order**. Each phase should leave the app buildable and testable.

---

### Phase A — Docs & contracts freeze

**Goal:** Written contract matches this plan before schema/code.

| ID | Task | Done when |
|----|------|-----------|
| A1 | Add short UBAC section to `docs/[06] RBAC/[01] rbac-layers.md` (storage = role + user overlay; engine = merge rule) | Layers doc mentions allow/deny overlay ✅ |
| A2 | Note in `docs/[06] RBAC/[05] enforcement.md`: effective set includes UBAC; still no permission-mirrored RLS | Enforcement doc updated ✅ |
| A3 | Note in `docs/[06] RBAC/[04] service-authorization.md`: services keep calling the same assert helpers; helpers use effective set | Doc updated ✅ |
| A4 | Cross-link this plan from `[03] rbac-implementation-plan.md` as follow-on | Link present ✅ |
| A5 | Overlay manage gate: reuse `rbac.manage` **and** hard-require `profiles.role === manager` in the service (no new `rbac.user_permissions.manage` key) | Locked #5 + this row ✅ |

**Status:** Implemented (2026-09-14). Docs only — no schema/code.

**A5 decision (frozen):** UI may hide the overlay editor behind `rbac.manage` + manager role, but the **service** must reject non-`manager` actors even if they somehow hold `rbac.manage` via role or a future overlay. No new permission key in Phase B+.

**Out of scope:** code, migrations (Phase B).

---

### Phase B — Schema & repository

**Goal:** Persist per-user allow/deny overlays with replace-all semantics.

| ID | Task | Done when |
|----|------|-----------|
| B1 | Migration: create `user_permissions` (`user_id` → `profiles.id` ON DELETE CASCADE, `permission_key` → `permissions.key`, `effect` check in `('allow','deny')`, `created_at`, optional `granted_by` → `profiles.id`) | Table exists ✅ `20260916120000_user_permissions.sql` |
| B2 | Unique `(user_id, permission_key)`; indexes for `user_id` | No duplicate keys per user ✅ PK + indexes |
| B3 | Update DBML / database explanation docs | Docs match ✅ |
| B4 | Regenerate / adjust `types/supabase.ts` | Types compile ✅ (manual insert; re-run `npm run gen:types` after push if desired) |
| B5 | Repository: `listUserPermissionRows(userId)`, `replaceUserPermissions(userId, rows)` (hard-delete missing + upsert/insert snapshot), `deleteUserPermissions(userId)` / delete by keys | Unit tests for replace ✅ |
| B6 | No RLS policy that mirrors keys (follow existing permissions tables pattern / service-role access as today) | Matches enforcement stance ✅ (no RLS on table) |

**Suggested row shape**

```text
user_permissions (
  user_id uuid not null references profiles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  granted_by uuid null references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_key)
)
```

**Status:** Implemented in repo (2026-09-14). Apply with `npx supabase db push` (or your usual migrate path), then smoke that the table exists.

**Repo API:** `listUserPermissionRows`, `replaceUserPermissions`, `deleteUserPermissions`, `deleteUserPermissionKeys`; `deletePermissionsNotInKeys` also clears orphan `user_permissions`.

---

### Phase C — Authorization engine + session pack

**Goal:** One merge rule everywhere; shell caches **effective** keys.

| ID | Task | Done when |
|----|------|-----------|
| C1 | Pure helper: `mergePermissionSets({ roleKeys, allows, denies })` → `ReadonlySet<PermissionKey>` (+ unit tests: allow beyond role, deny beats role, deny beats allow) | Tests green ✅ `lib/auth/permission-checks.ts` |
| C2 | Extend permission load path: on session MISS / `getUserPermissions*`, load role keys **and** user overlay rows, then merge | `getUserPermissionsCached` returns effective ✅ |
| C3 | Parallel MISS path: today profile ∥ role-perms; add user-overlay fetch (parallel with those when `userId` known) | Pack still correct; no role-only leak ✅ via `getEffectivePermissionsForUserCached` |
| C4 | Session shell continues to store `permissionKeys` as **effective** only (UI/route gates unchanged callers) | HIT serves effective ✅ |
| C5 | Keep `getPermissionsForRoleCached` for Manager RBAC role matrix UI only — do **not** use it as the user’s effective set | Call sites audited ✅ (session + login use effective) |
| C6 | Cache bust helpers: document `clearCachedSessionShell(userId)` on overlay save; role matrix save still clears role cache + shells as today | Comments ✅ shell + role-cache + rbac actions |
| C7 | Optional: short-TTL per-user overlay cache — **skipped**; overlay loads on each shell MISS (request React `cache` only) | Decision: no process-TTL overlay cache ✅ |

**Status:** Implemented in repo (2026-09-14).

**Tests:** `permission-checks` (merge), `authorization.service` (allow/deny), `session` + `auth.service` (effective warm).

**API notes**

- `mergePermissionSets` — pure merge
- `getEffectivePermissionsForUserCached(userId, role)` — session / login
- `getUserPermissions` / `getUserPermissionsCached` — effective
- `getPermissionsForRoleCached(role)` — **role matrix only**

---

### Phase D — Manager service API + audit

**Goal:** Manager-only replace snapshot with audit; lockouts.

| ID | Task | Done when |
|----|------|-----------|
| D1 | Service `getUserAccessBreakdown(actor, userId)` → `{ role, roleKeys, overlayRows, effectiveKeys }` | Manager can read breakdown ✅ |
| D2 | Service `replaceUserPermissionsForManager(actor, userId, rows)` — assert `actor.role === manager` (and `rbac.manage`); validate keys ∈ catalog; full snapshot replace; `granted_by = actor`; `clearCachedSessionShell(userId)` | Non-manager denied ✅ |
| D3 | Audit on replace: `table_name: "user_permissions"`, `record_id: userId`, `old_data` / `new_data` = overlay snapshots, `severity: "warning"`, metadata note | Visible in audit UI ✅ |
| D4 | `rbac.manage` lockout: refuse snapshot that would leave **zero** managers with effective `rbac.manage` | Cannot lock all managers out via deny ✅ |
| D5 | Wire server actions under `app/(panels)/manager/users/` with toast messages | Action + toast key ✅ |
| D6 | Role-change path in `updateManagerUser`: detect `previousRole !== role`; compute private sets; if non-empty, require explicit `keepPrivatePermissions`; apply keep or hard-delete; audit keep/clear | Role change without flag fails when privates exist ✅ |
| D7 | When privates empty (or only redundant allows ⊆ new role): auto-prune redundant allows; no dialog | Edit user saves without extra step ✅ |

**Status:** Implemented in repo (2026-09-14). UI dialog/editor for overlay + keep-private confirm is Phase E.

**API surface**

- `services/auth/user-permissions.service.ts` — breakdown, replace, classify/plan/commit role-change overlay
- Actions: `replaceUserPermissionsAction`, `getUserAccessBreakdownAction`; `updateUserAction` returns `requiresKeepPrivateDecision`
- Toast key: `TOAST_MESSAGES.success.user_permissions_updated`

---

### Phase E — Admin UI (Users + Edit)

**Goal:** Both surfaces; three-way visibility; role-change dialog.

| ID | Task | Done when |
|----|------|-----------|
| E1 | User details panel: section **Permissions** — columns/groups: From role / Private (allow|deny) / Effective | Manager sees breakdown |
| E2 | Edit overlay UI (sheet/dialog): catalog grouped like Manager RBAC; per key states: default (role only) / allow / deny; save = full snapshot of non-default rows | Pending-aware dialog patterns |
| E3 | Open same editor from manage-users list actions **and** user details | Both entry points |
| E4 | `EditUserDialog` role change: if privates to ask → confirm dialog “Keep private permissions?” before submit (or two-step submit with `keepPrivatePermissions`) | Matches Locked #4 |
| E5 | Read-only hint on Manager RBAC page: “Users may have private allow/deny overlays; effective access = role ∪ allow − deny.” | Copy live |
| E6 | Gate overlay editor with manager role (UI) + service assert (D2) | Co-manager without manager role cannot open |
| E7 | Toasts via `useActionStateToast` / helpers; no inline success banners | Toast rules respected |

**Status:** Planned.

**Out of scope:** redesign of role-matrix page beyond the hint (E5).

---

### Phase F — Route / UI consumer audit

**Goal:** Confirm all consumers already use effective keys from the pack (no role-only shortcuts left).

| ID | Task | Done when |
|----|------|-----------|
| F1 | Audit `requireManagerRoutePermission`, nav filters, `PermissionsProvider`, `Can` — all read session/effective keys | Checklist signed |
| F2 | Audit any direct `getPermissionsForRoleCached(user.role)` used for **authorization** of a user (should be zero) | None left for authz |
| F3 | Document known limitation: middleware panel access remains role-only (by design) | Note in enforcement doc / this plan |
| F4 | Manual smoke: co-manager with private `guests.create` allow sees button + service succeeds; with deny on a role-granted key, UI hidden + service 403 | Smoke OK |

**Status:** Planned.

---

### Phase G — Tests, seed, docs closeout

**Goal:** Regression safety and docs truth.

| ID | Task | Done when |
|----|------|-----------|
| G1 | Unit tests: merge helper; replace repository; manager-only service; lockout; role-change keep/clear | CI green |
| G2 | Update RBAC regression checklist / permission-definitions if any new manage key was added (none if reusing `rbac.manage`) | Docs match |
| G3 | Optional seed: zero user overlays by default | Seed clean |
| G4 | Update slowliness / session_pack notes if overlay fetch adds a leg on MISS | Perf doc note |
| G5 | Mark this plan status → Implemented when Phases A–F signed off | Status line updated |

**Status:** Planned.

---

## Testing matrix (cross-phase)

| Scenario | Expect |
|----------|--------|
| User allow key not on role | Effective has key; service allows; `Can` shows |
| User deny key on role | Effective lacks key; service denies; `Can` hides |
| Allow + role same key | Single effective allow; overlay row optional/redundant |
| Role change, private allow not on new role, **Keep** | Overlay row remains; effective includes it |
| Role change, private allow already on new role | No ask for that key; may prune redundant allow row |
| Role change, private deny vs new role grant, **Discard** | Deny row removed; effective follows new role |
| Non-manager calls replace API | Unauthorized |
| Deny `rbac.manage` on last manager who has it | Blocked by lockout |
| Teacher + allow `students.view` | Still cannot open `/manager` |
| Role matrix edit | Existing RBAC UI works; shells/role cache cleared as today |

---

## Explicit non-goals (this plan)

- Multi-role (`user_roles`) / many roles per user  
- Permission-mirrored Postgres RLS  
- UBAC opening panels the role cannot access  
- Per-key keep/discard multi-select on role change (v1)  
- Letting co-manager / CEO manage overlays without `role === manager`  
- Soft-delete of overlay rows  

---

## Suggested PR / ship order

1. **PR1:** Phase A docs + Phase B migration/repo  
2. **PR2:** Phase C engine + session (feature-complete backend merge; UI still role-looking until E)  
3. **PR3:** Phase D services/actions/audit + Phase E UI  
4. **PR4:** Phase F audit + Phase G tests/docs closeout  

Each PR should stay deployable; after PR2, effective permissions already honor any rows inserted manually/SQL for smoke tests.

---

## Open implementation details (small; decide during Phase D/E)

These do **not** reopen Locked decisions:

1. Exact confirm copy for keep vs discard private permissions (EN).  
2. Whether redundant allows (⊆ role) are stored or stripped on every save (recommendation: **strip on save** so snapshot = true privates only; denies that don’t intersect role can also be stripped).  
3. Whether `granted_by` is required or nullable for legacy/SQL rows.  
4. Whether overlay editor lives as a dedicated sheet vs tab inside user details (both entry points still required).  

---

## Quick reference — files likely to change

| Area | Likely touch |
|------|----------------|
| Migration | `supabase/migrations/…_user_permissions.sql` |
| Repo | `repositories/permission.repository.ts` (or `user-permission.repository.ts`) |
| Engine | `services/auth/authorization.service.ts`, `lib/auth/permission-checks.ts` |
| Session | `lib/auth/session.ts`, caches under `lib/auth/` |
| RBAC / users services | `services/auth/rbac.service.ts`, `services/auth/user.service.ts` |
| Actions | `app/(panels)/manager/users/actions.ts` |
| UI | `user-details-panel.tsx`, `edit-user-dialog.tsx`, `manage-users-panel.tsx`, new overlay editor component |
| Docs | `docs/[06] RBAC/*`, this plan, DBML |
| Audit | `services/ops/audit-log.service.ts` (reuse `recordManagerAuditLog`) |
