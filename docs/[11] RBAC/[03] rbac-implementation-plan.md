# RBAC — Implementation Plan

Task-based phases to add permission-based access to Etkan MS.  
Each phase has clear tasks and a **testing** checklist before moving on.

**Current state:** one role per user (`profiles.role`), panel access by role, manager-only checks in services. No permission tables or engine yet.

**Target:** six layers live — definitions → storage → engine → backend → frontend → RBAC manager UI.

**Rule while building:** manager keeps full access until a phase intentionally changes that. Seed the manager role with every permission.

---

## Guiding decisions

1. Keep **panel routing** on `profiles.role` (admin / manager / co-manager / ceo / teacher / trainer / student). Do not redesign panels first.
2. Add **permissions** and **role ↔ permission** links in the database.
3. Put **allow/deny** in one authorization engine. Services call it — not repositories, not UI.
4. Replace `actorRole !== manager` checks **feature by feature**, not all at once.
5. UI hide/show is last among enforcement steps — backend must already deny.
6. RBAC Manager UI comes **after** engine + backend work on at least one full feature path.

---

## Phase 0 — Align and freeze the permission list

Turn the business list into stable keys before any schema or code engine.

### Tasks

- [x] Review `docs/[11] RBAC/[02] permission-definitions.md` with the team
- [x] Decide final feature groups (keep or merge small ones)
- [x] Agree naming style for keys (example: `students.view`, `students.create`, `grades.compute`)
- [x] Add a short note in the doc: **key ↔ human label** for each permission
- [x] Mark which permissions are **read** vs **write** (helps UI and tests later)
- [x] Confirm: Accounting stays as view-only until that feature exists

### Testing

- [x] Every manager action in `[02]` has exactly one key
- [x] No duplicate keys
- [x] Naming is consistent across features

**Done when:** permission list is frozen and ready to code. ✅

**Result:** `[02] permission-definitions.md` frozen — 84 keys, `{feature}.{action}`, read/write marked. Ready for Phase 1.

---

## Phase 1 — Permission Definitions (code)

Official list lives in code so the app and seeds share one source.

### Tasks

- [ ] Create `lib/constants/permissions.ts` (or similar) with all permission keys
- [ ] Group keys by feature (match `[02]`)
- [ ] Add human labels / descriptions map for UI later
- [ ] Export TypeScript type for a permission key
- [ ] Export helper lists (all keys, keys by feature)
- [ ] Document: new feature → add permission here first

### Testing

- [ ] Unit test: all keys are unique
- [ ] Unit test: key format matches the agreed pattern
- [ ] Typecheck passes with the new module

**Done when:** app code can import stable permission keys.

---

## Phase 2 — Data Layer Storage

Store roles’ permissions in the database. Keep `profiles.role` as the user’s role for now.

### Tasks

- [ ] Design tables:
  - [ ] `permissions` — key, label, feature group, description
  - [ ] `role_permissions` — role + permission key (unique pair)
- [ ] Write migration(s)
- [ ] Seed all permission rows from Phase 1 constants
- [ ] Seed **manager → all permissions**
- [ ] Seed other roles with empty or minimal sets (decide per role; student/teacher can stay empty for now)
- [ ] Add repository methods: list permissions, list by role, replace role permissions
- [ ] Update generated/DB types if the project uses them
- [ ] Note in database docs what these tables are for

### Testing

- [ ] Migration applies cleanly on empty and existing DB
- [ ] Seed: manager has every permission from Phase 1
- [ ] Seed: no orphan permission keys
- [ ] Repository read/write works in isolation (simple service or script test)
- [ ] Rollback / reset path still works for local dev

**Done when:** DB holds the catalog and manager’s full grant.

---

## Phase 3 — Authorization Engine

One place answers: *can this user do this action?*

### Tasks

- [ ] Add authorization service (e.g. `services/authorization.service.ts`)
- [ ] Implement `getUserPermissions(userId)` (via profile role → role_permissions)
- [ ] Implement `hasPermission(userId, permission)`
- [ ] Implement `requirePermission(userId, permission)` (throw / return unauthorized result)
- [ ] Optional: `hasAnyPermission` / `hasAllPermissions` for compound UI gates
- [ ] Cache strategy for one request (avoid N queries per page) — e.g. load once per request
- [ ] Keep repositories free of auth logic; engine uses permission repositories only
- [ ] Do **not** remove old manager role checks yet

### Testing

- [ ] Unit tests: manager user → allowed for sample permissions
- [ ] Unit tests: teacher/student with no grants → denied
- [ ] Unit tests: unknown permission key → denied (safe default)
- [ ] Unit tests: missing user / missing profile → denied
- [ ] Unit tests: requirePermission fails with a clear unauthorized outcome
- [ ] Smoke: engine used from a throwaway script or temporary call site without breaking login

**Done when:** engine is trusted and tested; nothing critical depends on it yet.

---

## Phase 4 — Backend Protection (first slice)

Wire the engine into real mutations for **one feature group**, prove the pattern, then repeat.

### 4A — Pattern (pick Subjects as first slice)

- [ ] Replace manager-only check in subject services with `requirePermission`
- [ ] Map actions:
  - view list/detail → `subjects.view`
  - create → `subjects.create`
  - edit → `subjects.update`
  - delete → `subjects.delete`
- [ ] Keep server actions calling services (no permission checks in actions if service already checks)
- [ ] Return the same unauthorized shape the UI/toasts already understand

### 4A Testing

- [ ] Manager still can CRUD subjects
- [ ] User without subject permissions cannot create/update/delete (direct action call)
- [ ] View-only grant can list but not mutate (once a non-manager test user exists)
- [ ] Unauthorized does not leak data or partial writes

### 4B — Roll out remaining features (same pattern)

Do one feature group per pass. Check off when service checks are permission-based:

- [ ] Users
- [ ] Students
- [ ] Relationships
- [ ] Classes
- [ ] Sessions
- [ ] Attendance
- [ ] Tasks
- [ ] Final exams
- [ ] Grades
- [ ] Semesters
- [ ] Equipment / borrows
- [ ] Schedule
- [ ] Notifications
- [ ] Emailing / sent
- [ ] Reports
- [ ] Analytics
- [ ] Backup
- [ ] Logs
- [ ] Cron jobs (view)
- [ ] Settings / maintenance
- [ ] Dashboard reads (if gated)

### 4B Testing (per feature)

- [ ] Manager happy path still works
- [ ] Denied user cannot complete the write (and sensitive reads where applicable)
- [ ] Existing toasts / error handling still correct
- [ ] No service left with only `=== manager` for that feature

### 4C — Cleanup

- [ ] Remove obsolete manager-only helpers where fully replaced
- [ ] Shared helper: `assertPermission(actor, key)` used everywhere
- [ ] Document the service-layer rule in a short RBAC note

### 4C Testing

- [ ] Grep: no stray `actorRole !== ROLES.MANAGER` on finished features
- [ ] Regression pass on manager panel critical flows (students, classes, grades, schedule)

**Done when:** every manager service gate uses permissions; manager still has full access via seed.

---

## Phase 5 — Route and panel access (light)

Keep role → panel root. Add permission awareness where a route should be blocked even inside the manager panel.

### Tasks

- [ ] Map manager routes → required **view** permission (e.g. `/manager/subjects` → `subjects.view`)
- [ ] Decide enforcement place: layout helper and/or middleware extension
- [ ] Deny page access when view permission is missing (redirect or forbidden page)
- [ ] Keep cross-panel rule: user only enters their role’s panel root
- [ ] Decide admin/backup overlap (today admin can backup) → express as permissions

### Testing

- [ ] Manager with all permissions: all manager routes open
- [ ] Test user with only `subjects.view`: subjects ok, other manager pages blocked
- [ ] Wrong panel root still blocked by role (teacher cannot open `/manager`)
- [ ] Login redirect and maintenance behavior unchanged

**Done when:** deep links respect permissions, not only the sidebar.

---

## Phase 6 — Frontend Authorization

Show only what the user may use. Backend already denies.

### Tasks

- [ ] Load current user’s permission set for the panel (server or shared loader)
- [ ] Filter sidebar / nav by view permissions
- [ ] Gate buttons and menus (create / edit / delete) with permission checks
- [ ] Shared helpers: `Can` / `hasPermission` client-safe data from server props (no secrets)
- [ ] Empty / forbidden states when a page is opened without access
- [ ] Do not rely on UI alone — never skip Phase 4

### Testing

- [ ] Full manager: nav and actions unchanged
- [ ] Restricted test role: nav only shows allowed features
- [ ] Hidden buttons cannot be “shown” by DOM tricks — server still denies
- [ ] Mobile nav matches desktop filtering
- [ ] No flash of forbidden items if avoidable (prefer server-filtered nav)

**Done when:** UI matches grants; unauthorized actions still fail on server.

---

## Phase 7 — Administration Interface (RBAC Manager)

Let an authorized person manage role permissions without code deploys.

### Tasks

- [ ] Decide who may open RBAC Manager (e.g. `rbac.manage` permission; grant to manager or admin only)
- [ ] Add panel page(s): list roles, view permissions by role
- [ ] Edit role permissions (checkboxes by feature group)
- [ ] Save via service + repository (engine permissions apply to this UI too)
- [ ] Protect: cannot remove last lockout path for the only superuser (safety rule)
- [ ] Optional later: assign custom roles — **out of scope** until single-role flow is stable
- [ ] Audit log when role permissions change (if logs feature supports it)

### Testing

- [ ] Manager with `rbac.manage` can open and save
- [ ] User without `rbac.manage` cannot open or call save action
- [ ] After save: engine reflects new grants on next request
- [ ] Revoking `subjects.delete` blocks delete for that role immediately (or after agreed cache TTL)
- [ ] Safety: cannot strip all access from the only account that can restore it
- [ ] UI grouped clearly by feature (matches `[02]`)

**Done when:** role permissions are editable in-app and enforced.

---

## Phase 8 — Hardening and RLS (follow-up)

Strengthen data-level protection after app RBAC works.

### Tasks

- [ ] Decide: which paths use session client vs admin client
- [ ] Add RLS policies aligned with permissions **or** keep admin-client-only for manager domain and document that service checks are mandatory
- [ ] Permission cache invalidation when RBAC Manager saves
- [ ] Performance check on pages with many permission gates
- [ ] Final security review of backup, settings, user create, grades export

### Testing

- [ ] Penetration-style checks: call actions as wrong role / no permission
- [ ] Session client cannot read forbidden rows if RLS is enabled
- [ ] Load test critical list pages still acceptable
- [ ] Full manager regression checklist (below)

**Done when:** enforcement story is documented and verified end-to-end.

---

## Final regression checklist (after Phase 6+)

Run as manager (full seed):

- [ ] Users / students / relationships CRUD paths used daily
- [ ] Class → session → attendance → task → final exam → compute grade
- [ ] Equipment borrow + return
- [ ] Schedule create/edit/delete
- [ ] Notifications + email send/resend
- [ ] Reports export, analytics open, backup download
- [ ] Settings: maintenance toggle + own credentials

Run as restricted test user:

- [ ] Only allowed features visible and usable
- [ ] Direct URL and direct action calls denied elsewhere

---

## Suggested calendar order

| Order | Phase | Depends on |
|------:|-------|------------|
| 0 | Align permission list | — |
| 1 | Code permission keys | 0 |
| 2 | DB + seeds | 1 |
| 3 | Authorization engine | 2 |
| 4A | Backend — Subjects slice | 3 |
| 4B | Backend — remaining features | 4A |
| 5 | Route gates | 4A (can overlap 4B) |
| 6 | Frontend gates | 5 + enough of 4B |
| 7 | RBAC Manager UI | 3 + 4A minimum |
| 8 | Hardening / RLS | 6–7 |

---

## Out of scope for the first delivery

- Multi-role per user (`user_roles`)
- Custom roles created from scratch in UI
- Teacher / student domain permissions (until those panels have real features)
- Redesigning panel shells per role

Add these as a later plan after Phase 7 is stable.

---

## Related docs

- `[01] rbac-layers.md` — six layers (business view)
- `[02] permission-definitions.md` — feature permission list (manager baseline)
