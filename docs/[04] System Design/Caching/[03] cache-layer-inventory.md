# Cache layer inventory — Etkan MS

Maps **features / service functions** to the **best-fit cache layer**.  
Policy and how-to: [`[01] caching.md`](./[01]%20caching.md). Shared-list FAQ: [`[02] shared-cache-across-users.md`](./[02]%20shared-cache-across-users.md). Rule summary: `.cursor/rules/caching.mdc`.

**Status legend**

| Mark | Meaning |
|------|---------|
| **Shipped** | Implemented in code today |
| **Fit** | Recommended next / when optimizing that area |
| **Optional** | Nice if that screen feels slow; not urgent |
| **Avoid** | Wrong layer or unsafe for this data |

Layers below are mutually preferred per row; some screens combine layers (e.g. shared list + client `useState` after create).

---


# Cache Layer Inventory Overview

This document inventories **features/functions** by their most appropriate cache layer.

- **Shared server cache** (shipped):  
  - Used for: users, students, relationships, schedule instructors, schedule eligible workshops, schedule all sessions  
  - Good fit for: subjects, classes, semesters, equipments  
  - Optional for: gallery, reports  
  - **Avoid** for: details, monetary/grade/personalized data

- **Request-scoped cache**:  
  - Used for session packs and permissions (**shipped**)

- **Path revalidation**:  
  - Default for most CRUD/detail areas

- **Client cache**:  
  - Examples: UI list `useState`, back navigation, dialog options; instructor-schedule **client filter** over shared full sessions payload

- **Process TTL**:  
  - Example: maintenance mode (~15 seconds)

- **No cache / code constants**:  
  - Used for: mutations, accounting sync, cron catalog, etc.

See the [01 caching.md](./[01]%20caching.md) for policy/how-to and `.cursor/rules/caching.mdc` for rules. Each area is marked as: **Shipped**, **Fit**, **Optional**, or **Avoid**.

## 1. Shared server cache

**Tool:** `unstable_cache` + `revalidateTag` (+ usually `revalidatePath`)  
**Store:** Next.js Data Cache  
**Where in code:** service (or thin wrapper); admin client **inside** cached callback; auth **outside**  
**Break:** successful mutations call `revalidateTag` / helpers in `lib/cache/…`  
**Use when:** same payload for all managers; read-heavy; short staleness OK if writes invalidate

| Feature / area | Functions (primary) | Suggested tag | TTL | Status | Notes |
|----------------|---------------------|---------------|-----|--------|-------|
| Manage users list | `listUsersForManager` | `manager-users` | 3600s | **Shipped** | `user.service` + `revalidateManagerUsersList` / `PeopleLists` |
| Manage students list | `listStudentsForManager` | `manager-students` | 3600s | **Shipped** | Student writes → `revalidateManagerPeopleLists` (users list includes students) |
| Relationships list | `listRelationshipsForManager` | `manager-relationships` | none (invalidate-only) | **Shipped** | `revalidateManagerRelationshipsList` |
| Schedule instructor tabs | `getInstructorSchedulesPageForManager` / `listScheduleInstructorTabsForManager` | `manager-schedule-instructors` | 3600s | **Shipped** | `lib/cache/instructor-schedule-cache.ts`; invalidate on instructor add/remove + staff user CRUD |
| Schedule eligible workshops | `listEligibleWorkshopsForInstructorScheduleForManager` (also on page when CREATE) | `manager-schedule-eligible-workshops` | 3600s | **Shipped** | CREATE gate outside cache; workshop create/update/status/delete → calendar revalidate |
| Schedule all calendar sessions | `getInstructorSchedulesPageForManager` (shared all-slots cache) | `manager-schedule-sessions` | 3600s | **Shipped** | Locked workshops excluded; slot CRUD → `revalidateManagerScheduleSessions`; filters are client-only |
| Subjects catalog / list | `listSubjectsForManager` | `manager-subjects` | 3600s | **Fit** | Rarely changes; used in lists + selects |
| Classes list | `listClassesForManager` | `manager-classes` | 3600s | **Fit** | Shared manager catalog |
| Semesters list | `listSemestersForManager` | `manager-semesters` | 3600s | **Fit** | Catalog + accounting semester options |
| Equipments inventory list | `listEquipmentsForManager` | `manager-equipments` | 3600s | **Fit** | Invalidate on create/update **and** borrow/return that changes availability |
| Gallery (manager + public) | `listGalleryImagesForManager`, `listGalleryImagesForPublic` | `manager-gallery` / `public-gallery` | 3600s | **Optional** | Public page benefits most; invalidate on CRUD |
| Schedule-assistant catalogs | `listInstructorsCatalog`, `listSubjectsCatalog`, `listCapabilityMatrixCatalog` | `schedule-assistant-*` | 1800–3600s | **Optional** | Shared read catalogs for AI/schedule helpers |
| Income statement rollup | `getIncomeStatementForManager` | `manager-income-statement` | 60–300s | **Optional** | Expensive aggregate; short TTL + invalidate on accounting money writes |
| Income analytics | `getIncomeStatementAnalyticsForManager` | `manager-income-analytics` | 60–300s | **Optional** | Same pattern as rollup |
| Permission catalog (static shape) | `getPermissionCatalogForManager` / `getPermissionCatalogGrouped` | — | — | **Avoid** as Data Cache | Already in-code / cheap; roles+keys may need request scope instead |
| Cron jobs catalog | `listCronJobsForManager` | — | — | N/A | Already “cached in code” via `getManagerCronJobsCatalog()` — no Data Cache needed |

**Do not put in shared server cache (wrong fit / leak risk)**

| Feature / area | Functions | Why avoid shared key |
|----------------|-----------|----------------------|
| Session / who-am-I | `getSessionPack`, `getSessionUser`, role helpers | **Do not** use shared Data Cache / global key. Use request-scoped + **per-user process TTL** shell (`session-shell-cache`) |
| Permission grants for a user | `getUserPermissionsCached` / shell permission keys | Request-scoped + session shell TTL; invalidate on RBAC / logout — **not** shared Data Cache |
| Student / teacher “my …” views | `listStudentActivityForSelf`, future teacher schedule | Personalized |
| Class / workshop / SPP **detail** | `getClassForManager`, `getWorkshopForManager`, `getSppDetailForManager`, session/task detail | High churn, many keys, easy to miss invalidation |
| Grades sheets | `listClassStudentGradesForManager`, compute grade flows | Write-sensitive academic data |
| Accounting phase / SPP lists | `listPaymentPhasesForManager`, `listSppsForPhaseForManager`, payments CRUD | Money-critical; prefer fresh + `revalidatePath` |
| Audit / activity / sent mail | `listAuditLogsForManager`, `listStudentActivity*`, `listSentEmailsForManager` | Append-heavy, expect freshness |
| Notifications inbox | `listNotificationsForManager` | Per-actor / freshness matters |
| Backup / export | `exportFullDatabaseBackup`, etc. | One-shot ops, never cache |

---

## 2. Request-scoped cache

**Tool:** React `cache()`  
**Store:** Memory for **one HTTP request** only (not shared across users or navigations)  
**Break:** automatic — next request is cold  
**Use when:** same page/layout/action would otherwise hit the same DB work N times

| Feature / area | Functions | Status | Notes |
|----------------|-----------|--------|-------|
| Session pack | `getSessionPack` (+ thin projectors: user, role, display name, instructor, audit actor) | **Shipped** | `lib/auth/session.ts` — request dedupe; **under** it, process-TTL shell cache across navigations |
| User permission set | `getUserPermissionsCached` / `getPermissionsForRoleCached` → `hasPermission*` / `assertPermission` | **Shipped** | `authorization.service.ts`; shell cache + `rememberUserRole` avoid repeat profiles.role |
| Role + instructor flags used in layouts | consumed via `getSessionPack` in `RolePanelLayout`, manager route gate | **Shipped** | Prefer pack over re-fetching pieces |
| Multi-assert list pages | Accounting / class detail calling many services each asserting permission | **Fit** (keep using cached asserts) | Avoid uncached `getUserPermissions` on hot paths |
| RBAC Manager page load | `listRolesWithPermissionKeys` | **Optional** | Request-dedupe if page calls it more than once; **not** shared across managers after edits without layout revalidate |

---

## 3. Path revalidation (`revalidatePath`)

**Tool:** `revalidatePath` from `next/cache`  
**Store:** Marks RSC / route tree stale so the next navigation/load rebuilds  
**Break:** called after successful mutations in server actions  
**Use when:** page must refresh after a write even if there is **no** `unstable_cache` tag (most of the app today)

This is the **default invalidation layer** for detail and write-heavy features. Pair with shared tags when the list body is also Data-Cached.

| Feature / area | Typical paths / pattern | Status | Notes |
|----------------|-------------------------|--------|-------|
| Auth login / logout | `revalidatePath("/", "layout")` | **Shipped** | `app/(public)/auth/actions.ts` |
| RBAC save | `revalidatePath(MANAGER_ROOT, "layout")` | **Shipped** | Nav + permission UI refresh |
| Subjects CRUD | subjects list + detail (+ classes when linked) | **Shipped** | Path-only today |
| Classes / enrollments / sessions / grades | class detail, grades routes, related student routes | **Shipped** | Heavy fan-out — trim when optimizing |
| Workshops (+ payments / sessions / docs) | workshops list, detail, payments | **Shipped** | |
| Accounting phases / SPP / payments / adjustments | accounting list, phase, SPP | **Shipped** | Money-critical freshness |
| Instructors | instructors page (+ users list tag when staff changes) | **Shipped** | Hybrid: path + `revalidateManagerUsersList` + schedule instructors tag |
| Instructor schedules | `/manager/instructor-schedules` via schedule cache helpers | **Shipped** | Catalog + all-sessions tags; client filters only |
| Income statement | income-statement route | **Shipped** | |
| Users / students / relationships | via `revalidateManager*` helpers (tag **and** path) | **Shipped** | Model for other shared lists |

**Guideline:** Prefer **one** refresh strategy after mutate — tag/path on the server **or** client `router.refresh()`, not both stacked blindly (see slow-actions report).

---

## 4. Client cache

**Tool:** panel `useState` from RSC props; later TanStack Query where screens are client-driven  
**Store:** Browser (that tab / session only)  
**Break:** local update on success; `invalidateQueries` if Query is used; navigate away clears ephemeral state  
**Use when:** snappy UX for one manager — does **not** cut DB load for others

| Feature / area | Pattern | Status | Notes |
|----------------|---------|--------|-------|
| Manager list panels after create | Append / patch row in `useState` | **Shipped** (common pattern) | Users, students, etc. |
| Instructor schedule filter | `useMemo` over full cached sessions by browse/entity | **Shipped** | No per-filter fetch; shared server holds all sessions |
| Back-nav list → detail → list | Keep list state in client panel | **Fit** | Complements shared server list cache |
| Dialog select options (subjects, teachers, students) | Reuse options while dialog reopens | **Optional** → TanStack Query | Good when options refetch often in one session |
| Schedule / calendar UI filters | Client filter over already-loaded slots | **Fit** | Don’t cache DB; cache UI selection |
| Teacher / student tab switching (future) | Client cache of last-fetched panel data | **Optional** | Personalized — Query with user-scoped keys, not shared server |

---

## 5. Process TTL cache

**Tool:** module-level `let` + `expiresAt`  
**Store:** Node process memory (one instance; not multi-region shared)  
**Break:** TTL expiry or clear helper  
**Use when:** middleware / edge-adjacent checks that must stay cheap and tolerate seconds of staleness

| Feature / area | Functions | Status | Notes |
|----------------|-----------|--------|-------|
| Maintenance mode flag | `getCachedMaintenanceMode` / `setCachedMaintenanceMode` | **Shipped** | `lib/auth/maintenance-mode-cache.ts`, ~15s TTL |
| Session shell (per user) | `getCachedSessionShell` / `setCachedSessionShell` / `clearCachedSessionShell`; used by `getSessionPack` | **Shipped** | `lib/auth/session-shell-cache.ts`, **60s TTL**, keyed by JWT `sub`. Stores role, displayName, isInstructor, permission keys. Every request still runs `getClaims`. Bust on claims-role mismatch; clear on logout, RBAC save, user/instructor identity writes. Same process-memory limit as maintenance cache (not multi-region). |
| JWT role short-circuit in middleware | `roleFromJwtClaims` / `resolveUserRoleForMiddleware` | **Shipped** (claim prefer) | Not a Data Cache; avoids profiles round-trip when claim present |

**Avoid** process cache for: money totals, grade sheets, anything that must be consistent across all server instances immediately. Permission **grants** may live in the session shell TTL above (with invalidation); do not put them in shared Data Cache.

---

## 6. Explicitly “no cache” / code constants

Prefer **fresh** service → repository, or data that is already static in the repo.

| Feature / area | Functions | Why |
|----------------|-----------|-----|
| Mutations (all domains) | `create*` / `update*` / `delete*` / status changes | Never cache writes; only invalidate after |
| Accounting sync / recalc | `accounting-sync`, `accounting-recalc`, payment/adjustment services | Correctness over speed |
| Student status side effects | `changeStudentStatusForManager`, previews | Cross-domain; fresh |
| Session attendance / tasks | `updateAttendee*`, `createSessionTask*`, etc. | Live classroom data |
| Financial form public token flows | `getInviteFormContextByToken`, `submitFinancialFormByToken` | Security + freshness |
| Cloudflare AI usage log | `listCloudflareAiUsageForManager` | Ops log; fresh OK |
| Backup history | `getRecentBackupHistory` | Short list; freshness preferred |
| Cron catalog | `getManagerCronJobsCatalog` | Static constant |

---

## Cross-cutting map (quick pick)

| If the data is… | Best layer |
|-----------------|------------|
| Same for every manager, list/catalog, invalidate on CRUD | **Shared server** |
| Loaded many times in one RSC/action tree (session, permissions) | **Request-scoped** |
| Detail / money / grades / logs after a write | **`revalidatePath`** (no shared body cache) |
| One user’s snappy UI after create / back-nav | **Client** |
| Middleware flag, seconds of staleness OK | **Process TTL** |
| Personalized, write-heavy, or security-sensitive | **No shared cache** |

---

## Already shipped vs backlog (shared tags)

| Tag | Shipped? |
|-----|----------|
| `manager-users` | Yes |
| `manager-students` | Yes |
| `manager-relationships` | Yes |
| `manager-schedule-instructors` | Yes |
| `manager-schedule-eligible-workshops` | Yes |
| `manager-schedule-sessions` | Yes |
| `manager-subjects` | No — **Fit** |
| `manager-classes` | No — **Fit** |
| `manager-semesters` | No — **Fit** |
| `manager-equipments` | No — **Fit** |
| `manager-gallery` / public gallery | No — **Optional** |
| Report / dashboard aggregate tags | No — **Optional** (short TTL) |

Helpers live in `lib/cache/manager-list-cache.ts` and `lib/cache/instructor-schedule-cache.ts`; extend those modules when adding tags so actions stay consistent.

---

## Related docs

- [`[01] caching.md`](./[01]%20caching.md) — how to implement
- [`[02] shared-cache-across-users.md`](./[02]%20shared-cache-across-users.md) — multi-manager invalidation FAQ
- Reports on slow nav / actions under `docs/[07] Reports/` — refresh fan-out caveats
