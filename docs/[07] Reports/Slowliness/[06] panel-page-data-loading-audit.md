# Panel page data-loading audit

**Date:** 2026-10-24  
**Scope:** Authenticated panel routes (`app/(panels)/**`) — the **`application-code`** slice after auth is already warm.  
**Out of scope:** JWKS, `session_pack`, middleware cold start (see [`[05] cold-start-and-first-hop-bottlenecks.md`](./[05]%20cold-start-and-first-hop-bottlenecks.md)).  
**Goal:** Map where page data (Supabase REST / service graphs) should be fixed so navigations stop feeling ~1–1.5s when security is already fast.

---

## Simple picture (why this audit exists)

When you click a panel link:

1. Security desk (middleware + JWT) — often **~8ms** when warm  
2. Reception knows who you are (`session_pack HIT`) — often **~30–40ms**  
3. **Load the page’s data** (`application-code`) — often **~0.5–1.4s** ← this audit  

Example from a warm local session:

```text
jwks=HIT
session_pack HIT pack≈37ms
middleware total≈8ms
GET /manager/students … application-code: 1417ms   ← fix here
```

---

## Bottleneck types

| Type | Meaning | Typical fix |
|------|---------|-------------|
| **Waterfall** | Ask A, wait, then B, then C | `Promise.all` / start B as soon as A’s promise exists; Suspense |
| **Payload** | One (or few) calls return a huge list | Paginate, slim columns, SQL aggregates, cache |
| **Heavy graph** | Service does many related queries (even if parallel) | Narrow query, defer secondary panels, stream with Suspense |
| **Duplicate work** | Same row/class fetched twice on one page | Pass data down; skip second fetch |

---

## Hot routes (what your slow clicks usually are)

| Route | What the page loads | Main problem |
|-------|---------------------|--------------|
| `/manager/students` | Full student roster (+ profiles / emails) | **Payload** — no paging |
| `/manager/classes` | All class detail rows + count queries | **Payload** — no paging |
| `/manager/students/[id]` | Student → many panels → academic bundles after joined classes | **Waterfall + heavy graph** |
| `/manager/classes/[id]/grades` | Class, then grades unlock (class again), then grade context | **Duplicate + waterfall** |
| `/teacher/classes/[id]` | Class bundle + **two** deferred grade-summary trees | **Duplicate RSC work** |
| `/manager/accounting` (exceptions) | All SPPs for all non-cancelled phases | **Payload / heavy** (Suspense only helps paint) |
| `/teacher/settings` | Own teacher profile | Light; only a small duplicate profile read |

---

## Already in good shape (keep as patterns)

| Area | Why it’s OK |
|------|-------------|
| `manager/classes/[id]` shell | Wide `Promise.all` + `ClassAnalyticsDeferred` Suspense |
| `manager/accounting` shell | Parallel phases/sum + Suspense for exceptions |
| `manager/income-statement/analytics` | Summary first; heavy tables streamed |
| Workshops / gallery / notifications / logs | Already paged |
| Many detail pages | Secondary waves already use `Promise.all` |

---

## Prioritized backlog — status (2026-10-24)

### P0

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 1 | `/manager/students` | **Done** | Server page/search/status via `listStudentsPageForManager` + `loadStudentsPageAction`; global status head counts; search = name/phone (+ UUID). Full `listStudentsForManager` kept for other callers. |
| 2 | `/manager/classes` | **Done** | Server page/filter/search via `listClassesPageForManager` + `loadClassesPageAction`; `mapClassDetailRecordsToRows` only for the page; semester options from slim semester list. |
| 3 | `/manager/students/[id]` | **Done** | `joinedClassesPromise` → bundles overlapped; activity/borrows in `Suspense`; assignable classes loaded when Assign dialog opens. |
| 4 | `/manager/classes/[id]/grades` | **Done** | Reuse `classRow` in unlock; grades body in `Suspense`. |
| 5 | `/teacher/classes/[id]` | **Done** | Single `gradeSummarySlot`; panel mounts it for the active tab only. |
| 6 | `/manager/accounting` exceptions | **Done** | Membership ∥ SPP after class ids; slim SPP columns. Full SQL aggregate view still a future option. |

### P1

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 7 | `/manager/classes/[id]` | **Done** | Shell loads assigned teachers only; full catalog via `loadClassTeacherOptionsAction` when Teachers dropdown opens. Transfer options use slim picker (no counts). |
| 8 | `/manager/subjects/[id]` | **Done** | Subject detail ∥ catalogs in one `Promise.all`. |
| 9 | `/manager/income-statement` (+ history) | **Partly done** | History: month list ∥ statement + separate `Suspense`. Live month unchanged (page *is* the statement). |
| 10 | `/manager/accounting/phases/[id]` | **Skipped** | Client-filtered SPP table shared by many dialogs; server paging = rewrite. Revisit past ~1k SPPs/phase. |
| 11 | `/student/classes/[id]` | **Done** | `getJoinedClassForStudentSelf` by class id (no full joined list). Task detail: membership class row ∥ task fetch. |
| 12 | `/manager/registrations/[id]` | **Done** | `getRegistrationApplicationDetailPageForManager`: docs list ∥ breadcrumb after thin application fetch. |
| 13 | `/manager/emailing` (+ compose) | **Partly done** | Compose defers recipients until focus/bulk-role. Table/sent still use full tag-cached user list (needs server search/paging). |
| 14 | `/manager/users/[id]` | **Done** | Already `getUserForManagerById` (direct). |
| 15 | Teacher class bundles | **Done** | Dropped `getClassForManager` + duplicate student-list assert; counts from loaded rows. |
| 16 | `/manager/academic-analysis` | **Skipped** | Series already one RPC ∥ counts/students; caching invalidation too broad for a quick win. |
| 17 | `/manager/instructor-schedules` | **Done** | `canCreate` ∥ tabs; first calendar ∥ workshop picker. |

### P2

| # | Route | Status | Notes |
|---|-------|--------|-------|
| 18 | `/teacher/settings` | **Done** | Profile reused from assert. |
| 19 | `/manager/settings` | **Done** | Reset-password section in `Suspense`. |
| 20 | `/manager/semesters/[id]`, `/manager/guests/[id]` | Open | Small secondary waves. |
| 21 | Student task detail | **Done** | Covered with #11. |
| 22 | Small list pages | Open | Add paging when row counts hurt. |

Role dashboards that only `redirect(...)` need no data work.

---

## Suggested fix order (practical)

1. **Student detail** — overlap academic bundles + Suspense secondary panels  
2. **Students list + classes list** — paging / filters (payload)  
3. **Grades routes** — remove duplicate class fetch + Suspense body  
4. **Teacher class** — single grade-summary deferred boundary  
5. **Accounting exceptions** — stop loading every SPP  

---

## How to verify a fix

With `NEXT_PUBLIC_NAV_DEBUG=1` (or prod-like `npm start`):

1. Prefer **`npm run build` + `npm start`** (or Docker) — not only `npm run dev`.  
2. Open the route twice (ignore first dev compile).  
3. Confirm `session_pack HIT` / `jwks=HIT`.  
4. Watch **`application-code`** / page step timers drop — that is the success metric.

---

## Related

| Doc | Topic |
|-----|--------|
| [`[05] cold-start-and-first-hop-bottlenecks.md`](./[05]%20cold-start-and-first-hop-bottlenecks.md) | Auth/JWKS/session cold vs warm |
| [`[04] nav-debugger-findings-and-fix-tasks.md`](./[04]%20nav-debugger-findings-and-fix-tasks.md) | Nav debugger dump / earlier P1–P3 |
| [`../performance audit/[01] five-assumption-server-performance-audit.md`](../performance%20audit/[01]%20five-assumption-server-performance-audit.md) | Broader five-assumption scorecard |
| `.cursor/rules/session-auth.mdc` | Do not keep re-optimizing warm claims |

---

## One-line summary

Security and session are already fast when warm; fix **page data** — starting with **students/classes lists (too much data)** and **student detail / grades / teacher class (extra waits and duplicate work)**.
