# Caching in Etkan MS

Reference for when and how to cache data. Cursor rule summary: `.cursor/rules/caching.mdc`.  
Feature → layer inventory: [`[03] cache-layer-inventory.md`](./[03]%20cache-layer-inventory.md).

## Defaults

- **Do not cache by default.** Prefer fresh RSC → service → repository → Supabase.
- Add caching only when there is a clear need (DB load, slow lists, or snappy back-navigation).
- Keep repositories dumb: **no caching inside `repositories/`**.
- Never put shared-server cache around **auth/session** or per-user secrets with a global key.

## Two cache types

### Shared server cache

- Lives on the **Next.js server**.
- One result can serve **many requests / many managers** (same cache key).
- Primary tools: `unstable_cache` (or `cache`) + **`revalidateTag` / `revalidatePath`**.
- Goal: fewer Supabase round-trips under load; acceptable brief staleness if writes invalidate.

### Client cache

- Lives in the **browser** (React state, TanStack Query).
- Helps **only that user’s session/tab**.
- Goal: instant UI when revisiting a screen or reopening dialogs; optimistic updates.
- Does **not** reduce DB load for other managers on their first load.

## When to use which

| Need | Prefer |
|------|--------|
| Same list/catalog for all managers; read-heavy | Shared server cache |
| Expensive aggregates (reports / analytics) | Shared server cache (short TTL) |
| Instant back-nav / dialog options for one user | Client cache |
| Both load savings and snappy UX | Server cache + light client state |

| Avoid caching | Why |
|---------------|-----|
| Auth / session resolution | Correctness and security |
| Highly personalized per-row dashboards with no shared key | Wrong or leaky keys |
| Write-heavy screens with no invalidation plan | Stale UI for everyone |

## Realistic use cases (Etkan MS)

### Shared server cache — good fits

1. **Manage users list** — same staff list for every manager; invalidate on create/update/delete.
2. **Subjects / classes / semesters catalogs** — change rarely; used on list pages and selects.
3. **Equipment inventory list** — shared; invalidate on create/borrow/return updates.
4. **Cron jobs catalog** — if ever loaded from DB; today the static constant is already “cached in code.”
5. **Reports / analytics rollups** — expensive; TTL 1–5 minutes OK if product accepts slight lag.

### Client cache — good fits

1. **Back-navigation** — Users → user detail → Users without a full cold wait.
2. **Local panel state after create** — append the new row in `useState` (already common).
3. **Dialog option lists** — subjects/teachers reopened several times in one session (TanStack Query).
4. **Teacher/student tab switching** — schedule ↔ classes in one session.

### Combined (typical list page)

1. Server: cache `listUsersForManager` with tag `manager-users`.
2. Client: keep panel state after create so the actor sees the new row immediately.
3. On success: `revalidateTag("manager-users")` so the next RSC load is fresh for everyone.

## How to implement (server cache)

### 1. Cache at the service (or a thin wrapper), not the repository

```ts
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Create the admin client INSIDE the cached callback.
export function getCachedManagerUsersList() {
  return unstable_cache(
    async () => {
      const adminClient = createSupabaseAdminClient();
      // call existing list helper / repository orchestration
      return /* users */;
    },
    ["manager-users-list"],
    { tags: ["manager-users"], revalidate: 3600 }
  )();
}
```

Still run **authorization** (`assertManagerRole`) **outside** or before relying on cached data so unauthorized callers never get a list.

### 2. Invalidate on every successful mutation

In server actions after create / update / delete:

```ts
import { revalidateTag, revalidatePath } from "next/cache";

revalidateTag("manager-users");
revalidatePath("/manager/users");
```

No invalidation = stale lists until TTL expires.

### 3. Tag naming

Use stable domain tags:

| Domain | Tag |
|--------|-----|
| Users | `manager-users` |
| Students | `manager-students` |
| Subjects | `manager-subjects` |
| Classes | `manager-classes` |
| Semesters | `manager-semesters` |
| Equipments | `manager-equipments` |
| Relationships | `manager-relationships` |

One primary tag per list/catalog. Add more tags only when a mutation must refresh several domains.

## How to implement (client cache)

1. Prefer existing **panel `useState`** fed by RSC props for simple lists.
2. Introduce **TanStack Query** only when the page is client-driven (refetch, shared options across dialogs, stale-while-revalidate in the browser).
3. On mutation success: update local state **and/or** `queryClient.invalidateQueries({ queryKey: ["manager-users"] })`.
4. Mount `QueryClientProvider` once at a sensible layout level if/when Query is adopted — do not scatter providers per page without a plan.

## Checklist before adding cache

- [ ] Is the data shared across managers (or keyed safely by user id)?
- [ ] Is a short stale window acceptable?
- [ ] Are all write paths calling `revalidateTag` / `revalidatePath` (and client invalidate if used)?
- [ ] Is the cache key free of secrets and of the Supabase client instance?
- [ ] Is auth still checked on every request path?

## Implemented

### Manage users + Manage students lists

- **Module:** `lib/cache/manager-list-cache.ts`
- **Tags:** `manager-users`, `manager-students`
- **TTL:** 3600s (1 hour) safety net on `unstable_cache` if a write misses invalidation
- **Reads:** `listUsersForManager` / `listStudentsForManager` (auth outside cache; admin client created inside cache)
- **Invalidation:**
  - Staff user create → `revalidateManagerUsersList()` (users tag + `/manager/users`)
  - Student create / update → `revalidateManagerPeopleLists()` (both tags + both paths)
  - Future student delete → same as student create/update (`revalidateManagerPeopleLists`)
- **Why both on student writes:** Manage users lists all profiles (including students).

Use `revalidateTag(tag, "max")` (Next.js 16 two-arg API).

### Manage relationships list

- **Tag:** `manager-relationships`
- **TTL:** none — cache until explicit invalidation only
- **Reads:** `listRelationshipsForManager` (auth outside cache; admin client inside cache)
- **Invalidation:** relationship create / update → `revalidateManagerRelationshipsList()` (tag + `/manager/relationships`); future delete → same helper

### Instructor schedule page (fetch-all)

- **Module:** `lib/cache/instructor-schedule-cache.ts`
- **Tags:** `manager-schedule-instructors`, `manager-schedule-eligible-workshops`, `manager-schedule-sessions`
- **TTL:** 3600s on all three
- **Reads (one page load):**
  - Instructors + **all** calendar sessions (locked workshops excluded) + eligible workshops when actor has CREATE
  - Auth / CREATE gate outside caches
- **Invalidation:**
  - Instructor add/remove + staff user create/update → `revalidateManagerScheduleInstructors()`
  - Slot create/update/delete → `revalidateManagerScheduleSessions()`
  - Workshop create / update / status / delete → `revalidateManagerScheduleCalendar()` (catalogs + sessions)
- **Client:** filters are in-memory only over the full sessions payload (no per-filter server fetch)

## Out of scope (for now)

- Redis / external cache stores
- Caching PostgREST/`cron` schema directly from the browser
- Caching as a substitute for indexes or slow queries (fix the query first)
