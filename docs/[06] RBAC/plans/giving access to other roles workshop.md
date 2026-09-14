# Plan — Shared Manage Workshops access for other roles

**Status:** Implemented (v1 shared workshops)  
**Approach:** Option A — shared manager routes (one UI at `/manager/workshops*`, cross-role access by permission + `is_instructor`)  
**Scope (this plan):** Manage workshops feature only. Other shared pages (instructors list, instructor schedules standalone, etc.) are listed as future stubs — wire them the same way when specified.

---

## 1. Goals

1. Non-manager roles can open **Manage workshops** at existing URLs:
   - List: `/manager/workshops`
   - Detail: `/manager/workshops/[id]`
   - Payments overview: `/manager/workshops/payments` (gated separately)
2. Sidebar shows **Manage workshops** only when **both**:
   - profile `is_instructor === true` **or** `is_mentor === true`
   - user has `workshops.view`
3. List page action menu items are permission-gated (create / schedules / total payments).
4. Detail page **7 sections** show/hide by permission (not only action buttons inside them).
5. Do **not** duplicate pages under `/trainer`, `/co-manager`, etc.
6. Services keep `assertPermission` — UI hide is convenience; backend remains source of truth.

---

## 2. Non-goals (this plan)

- Sharing `/manager/instructors` or `/manager/instructor-schedules` as top-level sidebar items (except the list dropdown link to schedules when permitted).
- Opening the full manager panel to other roles.
- Changing URL slugs (`/manager/workshops` stays).
- Redesigning workshop UI.

---

## 3. Current state (baseline)

| Layer | Today |
|-------|--------|
| Routes | Live under `app/(panels)/manager/workshops/**` |
| Middleware | `canAccessPath` → one role → one panel root; non-managers **cannot** hit `/manager/*` |
| Manager layout | `requireRole(MANAGER)` then `requireManagerRoutePermission` |
| Nav | Workshops only in `MANAGER_PANEL_NAVIGATION` |
| List dropdown | Create → `workshops.create`; Schedules → `instructor_schedules.view`; Total payments → **ungated** |
| Detail sections | Always rendered; writes wrapped in `Can` |
| Services | Already use `assertPermission` |
| Seed | `WORKSHOP_ACCESS_SEED_PERMISSIONS` grants view/sessions/documents/instructors.view/schedules.view to non-managers — comment still says routes are manager-only |
| Missing permission | `workshops.payments.view` does **not** exist yet (only create/update/delete) |

### Detail page — 7 sections (as implemented)

| # | Section | Component | Write perms already used |
|---|---------|-----------|---------------------------|
| 1 | Details (info) | inline in `WorkshopDetailsPanel` | Edit/Delete in header: `workshops.update` / `workshops.delete` |
| 2 | Status stepper | `WorkshopStatusStepper` | `workshops.change_status` (+ some update) |
| 3 | Schedule slots | `WorkshopScheduleSlotsSection` | `instructor_schedules.view` / update / delete |
| 4 | Sessions | `WorkshopSessionsSection` | `workshops.sessions.create` / update / delete |
| 5 | Instructors | `WorkshopInstructorsSection` | `workshops.instructors.create` / update / delete |
| 6 | Documents | `WorkshopDocumentsSection` | `workshops.documents.create` / update / delete |
| 7 | Payments | `WorkshopPaymentsSection` | `workshops.payments.create` / update / delete |

---

## 4. Target product rules

### 4.1 Who can see the sidebar item

Show **Manage workshops** → `ROUTES.MANAGER_WORKSHOPS` when:

```
(is_instructor === true OR is_mentor === true)
AND hasPermission(workshops.view)
```

Applies to **every role** (admin, manager, co-manager, ceo, teacher, student, crm).
Assigning either attribute also syncs a personal readonly UBAC overlay (`workshops.view` + `instructor_schedules.view`) for that user; clearing both attributes revokes those overlay keys.

### 4.2 Shared routes (allowlist)

| Path | Required view permission |
|------|---------------------------|
| `/manager/workshops` | `workshops.view` |
| `/manager/workshops/[id]` | `workshops.view` |
| `/manager/workshops/payments` | `workshops.payments.view` (**new**) |

Only these prefixes are cross-role. Other `/manager/*` paths stay manager-only.

### 4.3 List page — header actions dropdown

| Action | Permission | Notes |
|--------|------------|--------|
| Create workshop | `workshops.create` | Already gated |
| View schedule / Schedules | `instructor_schedules.view` | Already gated; label may say “View schedule” |
| Total payments | `workshops.payments.view` | **Add gate**; create permission first |

Hide the whole overflow button if the user has **no** menu items (optional polish).

### 4.4 Detail page — section visibility

**Rule:** view permission → show section; write permission → show/enable write actions.

| # | Section | Show section | Write actions |
|---|---------|--------------|---------------|
| 1 | Details | `workshops.view` | Edit `workshops.update`, Delete `workshops.delete` |
| 2 | Status stepper | `workshops.view` | `workshops.change_status` |
| 3 | Schedule slots | `instructor_schedules.view` | schedule update/delete (existing) |
| 4 | Sessions | `workshops.view` | `workshops.sessions.create/update/delete` |
| 5 | Instructors | `workshops.view` | `workshops.instructors.create/update/delete` |
| 6 | Documents | `workshops.view` | `workshops.documents.create/update/delete` |
| 7 | Payments | `workshops.payments.view` (**new**) | `workshops.payments.create/update/delete` |

### 4.5 Core CRUD keys (list / shell)

From `permission-definitions.md`:

- `workshops.view`
- `workshops.create`
- `workshops.update`
- `workshops.delete`

Plus new: `workshops.payments.view`.

---

## 5. Architecture decisions

| Decision | Choice |
|----------|--------|
| Pattern | Shared manager routes (Option A) |
| Auth | Soften panel exclusivity **only** for workshop allowlist |
| Nav host | User keeps their role shell (`RolePanelLayout` by session role); deep-links into `/manager/workshops*` |
| Authorization stack | Middleware allowlist → manager layout role+path rules → path→view permission → service `assertPermission` |
| Instructor flag | Loaded from profile (`is_instructor`); required for **nav** (all roles) and for **non-manager** shared-route entry |

---

## 6. Implementation phases

### Phase 0 — Confirm product decisions (short)

- [x] Confirm roles in scope for v1 — **all roles**.
- [x] Confirm sidebar requires `is_instructor` for **every** role (including manager).
- [x] Confirm detail section visibility matrix in §4.4 (view → section; write → actions).
- [x] Confirm payments overview URL stays `/manager/workshops/payments`.

**Done when:** decisions written into this file’s “Decisions log” at the bottom. ✅

---

### Phase 1 — Permission catalog: `workshops.payments.view`

**Why:** Total payments menu + payments section/overview need a read permission; create/update/delete already exist.

- [x] Add `workshops.payments.view` to `docs/[11] RBAC/[02] permission-definitions.md`
- [x] Add `PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW` + `PERMISSION_DEFINITIONS` entry in `lib/constants/permissions.ts`
- [x] Include in manager full seed; add to CEO workshop writes package and any role that should see payments (decide who — likely **not** the minimal `WORKSHOP_ACCESS_SEED_PERMISSIONS` unless instructors should see $)
- [x] Run / document `npm run seed:rbac` (or migration path for existing DB grants)
- [x] Gate payments overview page route map + service list/read helpers with this permission
- [x] Unit/definition tests if present for permission catalog

**Done when:** key exists in docs + `permissions.ts`, seed updated, payments list/overview asserts the new view key. ✅

---

### Phase 2 — Shared route allowlist (auth)

**New helper** (suggested): `lib/auth/shared-manager-routes.ts`

- [x] `SHARED_MANAGER_WORKSHOP_PATH_PREFIXES` (workshops list/detail/payments only)
- [x] `isSharedManagerWorkshopPath(pathname: string): boolean`

**`lib/auth/path-access.ts`**

- [x] Extend `canAccessPath(pathname, role)`:
  - If shared workshop path **and** role is allowed for shared workshops → `true` (permission checked later)
  - Else keep current panel-root exclusivity
- [x] Deep link without `is_instructor`: non-manager denied in manager layout; manager allowed with view permission

**`app/(panels)/manager/layout.tsx`**

- [x] Replace hard `requireRole(MANAGER)` with:
  - Manager → OK
  - Non-manager → OK **only if** `isSharedManagerWorkshopPath(pathname)` **and** `is_instructor`; else redirect to that role’s dashboard
- [x] Always run permission gate afterward

**`lib/auth/require-manager-route-permission.ts`**

- [x] On deny, redirect to `getDashboardRouteForRole(sessionRole)` (not always `MANAGER_DASHBOARD`)
- [x] Map `/manager/workshops/payments` → `workshops.payments.view`
- [x] Keep `/manager/workshops` and `/manager/workshops/[id]` → `workshops.view`

**`lib/auth/manager-route-permissions.ts`**

- [x] Ensure longest-prefix match: `MANAGER_WORKSHOPS_PAYMENTS` before `MANAGER_WORKSHOPS`

**Tests**

- [x] `path-access.test.ts` — trainer can access `/manager/workshops`; cannot access `/manager/users`
- [x] `require-manager-route-permission` / route-map tests — payments requires new view key
- [x] Manager behavior unchanged for non-shared routes

**Done when:** logged-in instructor-role user with `workshops.view` can open `/manager/workshops` and detail; still blocked from other manager pages. ✅

---

### Phase 3 — Sidebar: Manage workshops for other roles

**Nav config** (`lib/constants/panel-nav.ts` + any role-specific nav)

- [x] Add **Manage workshops** item (`href: ROUTES.MANAGER_WORKSHOPS`) to each in-scope non-manager panel nav (trainer, teacher, co-manager, ceo, admin as decided)
- [x] Do **not** add full “Instructors & workshops” group unless specified later

**Nav filtering** (`components/panels/role-panel-layout.tsx` + `lib/auth/filter-panel-navigation.ts`)

- [x] Run permission-based nav filtering for **all** roles that include manager workshop hrefs (not only `MANAGER`)
- [x] Extend filter (or parallel filter) so workshop item also requires `is_instructor` for non-manager roles
- [x] Load `is_instructor` in layout (session/profile helper — add if missing under `lib/auth/session` or existing profile fetch)

**Manager nav**

- [x] Keep existing workshops entry; filter by `is_instructor` **and** `workshops.view` (same rule as other roles)

**Done when:** any role with `is_instructor` + `workshops.view` sees the item; without either, item hidden. ✅

---

### Phase 4 — List page UI gates

File: `components/manager/workshops/manage-workshops-panel.tsx`

- [x] Wrap **Total payments** in `Can permission={PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW}`
- [x] Keep Create → `workshops.create`
- [x] Keep Schedules → `instructor_schedules.view` (label: “View schedule” if desired)
- [ ] Optional: hide `DropdownMenu` trigger when no visible items
- [x] Optional: breadcrumb / post-action redirects stay on shared URLs (already `ROUTES.MANAGER_*`)

**Done when:** menu items match §4.3. ✅

---

### Phase 5 — Detail page section visibility

File: `components/manager/workshops/workshop-details-panel.tsx` (+ section components if cleaner)

- [x] Wrap each of the 7 sections per §4.4 matrix
- [x] Keep existing write `Can` wrappers inside sections
- [x] Payments section: require `workshops.payments.view`
- [x] Schedule section: require `instructor_schedules.view`
- [x] Status section: require `workshops.view` (actions stay on `workshops.change_status`)
- [x] Avoid empty page: user with only `workshops.view` still sees Details (and any other sections mapped to view)

**Done when:** stripping payment/schedule/status grants hides those sections without breaking the page. ✅

---

### Phase 6 — Services & API alignment

- [x] Workshop payments **read/list/overview** paths assert `workshops.payments.view` (not only create/update/delete)
- [x] Workshop detail loader: still requires `workshops.view`; strip payments/slots from response when user lacks section perms
- [x] Confirm no `requireRole(MANAGER)` on workshop actions; permission-only
- [x] Schedule assistant / related APIs unchanged unless reached from shared UI with same permission checks

**Done when:** a user without `workshops.payments.view` cannot load payments data even via crafted request. ✅

---

### Phase 7 — Seeds, docs, regression

- [x] Update `lib/constants/role-seed-permissions.ts` comment (cross-role workshop routes wired)
- [x] Update `docs/[11] RBAC/[08] role-seeded-permissions.md` — remove “routes stay manager-only”
- [x] Note in `[07] rbac-feature-report.md` / regression checklist: shared workshop paths + `is_instructor` nav rule
- [x] Manual checklist (below)

**Done when:** docs match behavior; seed grants match intended roles for `workshops.payments.view`. ✅

---

## 7. Manual test checklist

| # | Case | Expect |
|---|------|--------|
| 1 | Manager with full grants | Workshops nav + all sections + all menu actions |
| 2 | Trainer, `is_instructor=true`, `workshops.view` only | Sees sidebar item; opens list; no create; no total payments; detail shows Details (+ view-mapped sections); no payment section |
| 3 | Trainer, `is_instructor=false`, has `workshops.view` | No sidebar item; deep link **denied** (redirect to trainer dashboard) |
| 4 | Trainer with `workshops.create` | Create appears in dropdown |
| 5 | Trainer with `instructor_schedules.view` | View schedule link works; schedule section on detail visible |
| 6 | Trainer with `workshops.payments.view` | Total payments + payments section |
| 7 | Trainer opens `/manager/users` | Redirect to trainer dashboard |
| 8 | Teacher without workshop perms | No nav; `/manager/workshops` forbidden/redirect |
| 9 | Write actions without write perms | UI hidden; server returns unauthorized |

---

## 8. File touch list (expected)

| Area | Files |
|------|--------|
| Permissions | `lib/constants/permissions.ts`, `docs/[11] RBAC/[02] permission-definitions.md`, `lib/constants/role-seed-permissions.ts` |
| Auth | `lib/auth/shared-manager-routes.ts` (new), `path-access.ts`, `manager-route-permissions.ts`, `require-manager-route-permission.ts`, related `*.test.ts` |
| Layout | `app/(panels)/manager/layout.tsx`, `components/panels/role-panel-layout.tsx` |
| Nav | `lib/constants/panel-nav.ts`, `lib/auth/filter-panel-navigation.ts` (+ tests) |
| UI | `manage-workshops-panel.tsx`, `workshop-details-panel.tsx` |
| Services | `services/workshops/workshop.service.ts` (payments view asserts) |
| Docs | this plan, `[08]`, regression notes |

---

## 9. Future stubs (out of scope until specified)

Use the **same** Option A pattern when ready:

| Feature | Likely shared path | Sidebar rule (TBD) |
|---------|-------------------|---------------------|
| Manage instructors | `/manager/instructors` | TBD + `instructors.view` |
| Instructor schedules | `/manager/instructor-schedules` | TBD + `instructor_schedules.view` |
| Other pages | _user will specify_ | TBD |

Each future feature: extend allowlist prefixes → nav item + filter → section/`Can` gates → seed/docs. Do not broaden allowlist beyond what is product-approved.

---

## 10. Suggested implement order

1. Phase 0 decisions  
2. Phase 1 — `workshops.payments.view`  
3. Phase 2 — auth allowlist (unblocks real URLs)  
4. Phase 3 — sidebar + `is_instructor`  
5. Phase 4 — list dropdown  
6. Phase 5 — detail sections  
7. Phase 6 — service asserts  
8. Phase 7 — docs / QA  

Phases 4–5 can overlap once Phase 2 is green.

---

## 11. Decisions log

| Date | Decision | Notes |
|------|----------|--------|
| 2026-08-04 | Roles in v1 | **All roles** (admin, manager, co-manager, ceo, teacher, trainer, student) |
| 2026-08-04 | Manager needs `is_instructor` for nav? | **Yes** — same sidebar rule for every role |
| 2026-08-04 | Deep link without `is_instructor` | Non-manager: **deny**. Manager: allow with `workshops.view` |
| 2026-08-04 | Detail section matrix | View → show section; write → show actions (§4.4 locked) |
| 2026-08-04 | Who gets `workshops.payments.view` in seed | Manager (full catalog) + CEO workshop package; **not** minimal workshop seed |
| 2026-08-04 | Payments overview URL | Keep `/manager/workshops/payments` |
