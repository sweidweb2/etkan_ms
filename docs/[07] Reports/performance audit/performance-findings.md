# Performance findings report

**Date:** 2026-10-03  
**Scope:** Full codebase scan (app, components, services, repositories, auth/session, middleware). Code only — other docs ignored.  
**Method:** Mapped to areas in [`performance-audit.md`](./performance-audit.md) (the 100-prompt skill).  
**Goal:** Prioritized fix list. Do not treat this file as an auto-apply loop; use it as a backlog.

### Severity legend

| Level | Meaning |
|-------|---------|
| **critical** | Wrong totals / silent PostgREST truncation, or full-table client hydrate that will break at school scale |
| **high** | Large payload, N+1 / Auth Admin scans, or heavy DOM/bundle on hot manager routes |
| **medium** | Clear waste; scales worse over time but not yet correctness-breaking |
| **low** | Cleanup / guardrails / fixed-cost polish |

### Counts

| Severity | Count |
|----------|------:|
| critical | 8 |
| high | 22 |
| medium | 18 |
| low | 3 |
| **Total** | **51** |

### Recently fixed (do not re-open)

These were addressed on the income-statement / finance path and are **out of scope** for this backlog:

- DB RPC `sum_student_payment_amounts` (no JS all-time sum)
- DB RPC `list_income_statement_activity_months` (no full date pulls)
- Paged `listActiveUnpaidSpps`
- Narrowed transaction revalidation (live + analytics, not history)
- Year-wide analytics tables skip full ledger rows
- Parallelized income-statement waves + client table paging
- Hoisted transaction row permissions / shared delete dialogs

---

## A. Database & Data Layer

Skill prompts: 69–84 (indexes, N+1, column select, pagination, aggregates, avoid whole-table loads).

### A1. Workshop payment totals silently truncated at 1000

- **Severity:** critical  
- **Skill prompts:** 52, 78, 80  
- **Place:** `repositories/workshop-payment.repository.ts` → `aggregateWorkshopPaymentsTotals`; `services/workshops/workshop-queries.service.ts` → `getWorkshopPaymentsOverviewForManager`  
- **Finding:** Loads credit/debit amount rows and workshop ids, then reduces in JS with no `.range` loop. PostgREST `max_rows=1000` truncates → wrong overview totals.  
- **Suggested fix:** SQL/RPC aggregates (`sum` / `count` / `count(distinct workshop_id)`), or page all selects to exhaustion.

### A2. Workshops list paid-net loads (and truncates) all payment amounts

- **Severity:** critical  
- **Skill prompts:** 48, 80  
- **Place:** `services/workshops/workshop-shared.ts` → `attachPaidNet`; `listWorkshopsForManager`  
- **Finding:** `listWorkshopPaymentAmounts` without filter/range pulls the payments table (capped at 1000). Paid-net on the list is wrong and heavy.  
- **Suggested fix:** RPC `sum(signed amount) group by workshop_id` for listed IDs; always pass `workshopIds`.

### A3. Payment-phase SPP counts unbounded / truncated

- **Severity:** critical  
- **Skill prompts:** 78, 80  
- **Place:** `repositories/student-payment-phase.repository.ts` → `listSppStatusRowsByPaymentPhaseIds`; `services/accounting/payment-phase-shared.ts` → `buildSppCountsByPhaseId`  
- **Finding:** All SPP status rows for all phases loaded and counted in JS. >1000 SPPs → silent undercount.  
- **Suggested fix:** SQL `group by payment_phase_id` RPC/view, or page with `.range`.

### A4. Accounting exceptions load all SPPs without paging

- **Severity:** critical  
- **Skill prompts:** 80, 70  
- **Place:** `listSppsByPaymentPhaseIds`; `getAccountingExceptionsSnapshotForManager`  
- **Finding:** Every SPP for non-cancelled phases in one query. Truncation breaks exception detection.  
- **Suggested fix:** Page SPPs, or exception-specific SQL comparing enrollments vs SPPs.

### A5. Income-statement / analytics date-range loaders uncapped

- **Severity:** critical  
- **Skill prompts:** 52, 80  
- **Place:** `listPaymentsBetween`, `listPaymentAmountsBetween`, `listTransactionsBetween`, `listTransactionAmountsBetween`, `listFinancialAdjustmentsBetween`, `listFinancialAdjustmentAmountsBetween`; callers in income-statement (+ analytics) services  
- **Finding:** Month/year selects have no page loop. Busy periods >1000 rows → truncated ledgers/charts/totals.  
- **Suggested fix:** Page all date-range helpers; prefer SQL period buckets for chart paths.

### A6. Monthly “paid this month” is JS sum of amount rows

- **Severity:** high  
- **Skill prompts:** 78, 80  
- **Place:** `services/accounting/student-payment.service.ts` → `sumStudentPaymentsForMonthForManager`  
- **Finding:** `listPaymentAmountsBetween` + `.reduce` for a scalar; hits max_rows.  
- **Suggested fix:** RPC / DB `sum(amount)` for the month range (same pattern as `sum_student_payment_amounts`).

### A7. Class list counts via full membership/session row dumps

- **Severity:** high  
- **Skill prompts:** 78, 80  
- **Place:** `listStudentClassCountsByClassIds`, `listClassTeacherCountsByClassIds`, `listSessionCountsByClassIds`; used by class list / academic analysis mappers  
- **Finding:** Selects every membership/session row then counts in JS → bandwidth + silent truncation → wrong counts.  
- **Suggested fix:** SQL `group by class_id` count RPCs (or PostgREST aggregates).

### A8. Guests / teams list unbounded + notes over-fetch

- **Severity:** high  
- **Skill prompts:** 52, 71, 80  
- **Place:** `repositories/guest.repository.ts` → `listGuests` (`GUEST_COLUMNS` includes `notes`); `listGuestsForManager`; `listTeamsForManager`  
- **Finding:** No pagination; list pulls notes and full rows for every guest.  
- **Suggested fix:** Slim `GUEST_LIST_COLUMNS` (no notes); server page/cursor; notes on detail only.

### A9. Students-without-in-progress-class loads all profiles

- **Severity:** high  
- **Skill prompts:** 80, 71  
- **Place:** `services/students/student.service.ts` → `listStudentsWithoutInProgressClassForManager`  
- **Finding:** Full student profiles + in-progress memberships, filter in JS. Hot for accounting/classes pickers.  
- **Suggested fix:** SQL anti-join with slim columns + limit/page.

### A10. Teacher pickers load every profile

- **Severity:** high  
- **Skill prompts:** 71, 80  
- **Place:** `getClassCreateDialogDataForManager`, `listTeacherOptionsForManager` → `profileRepository.listProfiles`  
- **Finding:** Unfiltered full profiles for teacher select (not even `is_instructor`).  
- **Suggested fix:** Instructor-filtered slim `id, username` query.

### A11. Calendar “all entity” scope loads all schedule slots

- **Severity:** high  
- **Skill prompts:** 52, 80  
- **Place:** `listInstructorScheduleSlotsByEntity` / `listAllInstructorScheduleSlots`; `loadCalendarSessionsForScope`  
- **Finding:** Entity-wide paths select all slots with no range → max_rows truncates calendar.  
- **Suggested fix:** Always scope by `record_id` and/or date window; page if “all” remains.

### A12. Workshops list itself unbounded

- **Severity:** medium  
- **Skill prompts:** 52  
- **Place:** `repositories/workshop.repository.ts` → `listWorkshops`; `listWorkshopsForManager`  
- **Finding:** Full table order-by, no page; then payment attach (A2).  
- **Suggested fix:** Server page + slim list columns (keep `proposal_notes` detail-only).

### A13. Registration emails for guest list uncapped

- **Severity:** medium  
- **Skill prompts:** 52, 71  
- **Place:** `listActiveEmailsByGuestIds`; `attachGuestRegistrationEmails`  
- **Finding:** All non-cancelled apps for all guest IDs in one select; grows with apps × guests.  
- **Suggested fix:** Distinct-on / `group by guest_id` latest-email RPC, or chunk guest IDs.

### A14. Recalc path loads all payment amounts for SPP sets

- **Severity:** medium  
- **Skill prompts:** 52, 80  
- **Place:** `accounting-recalc.service.ts` → `loadAdjustmentAndPaymentsForSppIds`  
- **Finding:** Unpaged `.in(sppIds)` selects; large phases truncate and mis-recalc.  
- **Suggested fix:** Page by SPP id chunks + `.range`, or SQL sum/group inside recalc RPC.

### A15. Instructor candidates load all non-instructors

- **Severity:** medium  
- **Skill prompts:** 52, 80  
- **Place:** `listNonInstructorProfiles`; `listInstructorCandidatesForManager`  
- **Finding:** Full profiles where `is_instructor=false` for a dialog.  
- **Suggested fix:** Search/limit query; don’t preload entire user set.

### A16. Legacy unbounded list APIs still exported

- **Severity:** low  
- **Skill prompts:** 52, 80  
- **Place:** `listAllBorrows`, `listAllWorkshopPayments`, `listEmailSent` (beside paged variants)  
- **Finding:** Dead/legacy unbounded APIs remain — easy to regress call sites.  
- **Suggested fix:** Remove or harden with forced paging; keep only `*Page` exports.

---

## B. Network & API Efficiency

Skill prompts: 47–59 (payload trim, parallelize, waterfalls, dedupe, pagination, batching).

### B1. Guests page double-fetches entire guests table

- **Severity:** high  
- **Skill prompts:** 49, 50, 51  
- **Place:** `app/(panels)/manager/guests/page.tsx`; `listGuestsForManager` + `listTeamsForManager` (both call `listGuests` + registration emails)  
- **Finding:** Parallel page load runs two full guest list + email joins.  
- **Suggested fix:** Load guests once; pass into teams mapper, or teams query only member IDs with a slim select.

### B2. Academic analysis loads all students + Auth Admin emails

- **Severity:** high  
- **Skill prompts:** 48, 50, 56  
- **Place:** `getAcademicAnalysisForManager`  
- **Finding:** Unbounded profiles + class details + `listAuthEmailsByIds` (full Auth `listUsers` when >50 ids) for a dashboard that mostly needs counts/series.  
- **Suggested fix:** SQL status/session aggregates; paged student table endpoint; no Auth Admin fan-out.

### B3. `findAuthUserByEmail` scans all Auth users

- **Severity:** high  
- **Skill prompts:** 50, 56  
- **Place:** `repositories/auth.repository.ts` → `findAuthUserByEmail`; create/update user/student paths  
- **Finding:** Pages `auth.admin.listUsers` until email match — O(users) Auth Admin traffic.  
- **Suggested fix:** Persist email lookup (profiles/metadata) or admin get-by-email; stop full scans.

### B4. Student/user list Auth email resolution scales poorly

- **Severity:** high  
- **Skill prompts:** 56, 70  
- **Place:** `listAuthEmailsByIds`; `fetchStudentsForManager`, `fetchUsersForManager`, academic analysis  
- **Finding:** ≤50 → N× `getUserById`; >50 → full `listUsers` pagination. Growth forces Auth Admin table scans.  
- **Suggested fix:** Persist email on profiles / sync trigger; drop Auth Admin from list paths.

### B5. Income analytics sequential waves after first batch

- **Severity:** medium  
- **Skill prompts:** 49, 50  
- **Place:** `getIncomeStatementAnalyticsSummaryForManager`, `getIncomeStatementAnalyticsTablesForManager`  
- **Finding:** After payments/txns: await SPPs → phases → student labels; possible second date-range fetch on year mismatch.  
- **Suggested fix:** Resolve year/month before first fetch; parallelize independent lookups.

### B6. Analytics page runs unpaid-SPP scan twice

- **Severity:** medium  
- **Skill prompts:** 51  
- **Place:** `IncomeStatementAnalyticsTablesSection` + `IncomeStatementNextMonthSection`  
- **Finding:** Two full paged unpaid-SPP walks per visit (Suspense siblings).  
- **Suggested fix:** Request-scoped `cache()` / shared unpaid snapshot loader.

### B7. Accounting exceptions sequential after SPPs

- **Severity:** medium  
- **Skill prompts:** 49, 50  
- **Place:** `getAccountingExceptionsSnapshotForManager`  
- **Finding:** After classes+SPPs: awaits memberships, then profiles — waterfall.  
- **Suggested fix:** Start memberships in first wave; slim profiles only for exception IDs.

### B8. Schedule details reloads all workshops for lock filter

- **Severity:** medium  
- **Skill prompts:** 51, 55  
- **Place:** `getInstructorScheduleSlotsDetailsForManager` → `listWorkshopsForScheduleTabs` (uncached) while eligible workshops use `unstable_cache`  
- **Finding:** Duplicate workshop scans; details path bypasses cache.  
- **Suggested fix:** Reuse cached lock statuses or share eligible-workshops cache tag.

### B9. Password reset updates Auth users sequentially

- **Severity:** medium  
- **Skill prompts:** 49, 76  
- **Place:** `resetPasswordsByRoleForManager`  
- **Finding:** `for … await updateAuthUserPasswordByAdmin` — N serial Auth Admin calls.  
- **Suggested fix:** Bounded concurrency (`Promise.all` chunks of 5–10).

---

## C. Caching Strategy

Skill prompts: 60–68 (server cache, Cache-Control, invalidation, warm paths).

### C1. Workshop payment mutations revalidate income history

- **Severity:** medium  
- **Skill prompts:** 64  
- **Place:** `app/(panels)/manager/workshops/actions.ts` → `revalidateWorkshopPaymentPaths`  
- **Finding:** Every workshop payment write revalidates workshops + payments + detail + income statement + analytics + **history**.  
- **Suggested fix:** Drop history (and maybe analytics) unless those pages need workshop payments; keep statement only if linked.

### C2. Logout revalidates entire app layout tree

- **Severity:** medium  
- **Skill prompts:** 64  
- **Place:** `logoutAction` / `logoutDueToInactivityAction` → `revalidatePath("/", "layout")`  
- **Finding:** Broadest RSC cache invalidation on every logout.  
- **Suggested fix:** Revalidate login + panel roots only, or rely on cookie/shell clear already done.

---

## D. Frontend Rendering & Re-render Control

Skill prompts: 1–13 (memo, lists, debounce, virtualize, defer offscreen).

### D1. Students list ships entire roster to the client

- **Severity:** critical  
- **Skill prompts:** 5, 52, 80  
- **Place:** `app/(panels)/manager/students/page.tsx`; `ManageStudentsPanel`; `listStudentsForManager`  
- **Finding:** Full roster hydrated; filter/page are client-only. Payload + filter cost grow with enrollment.  
- **Suggested fix:** Server-page (cursor/offset + total); search via URL/server action.

### D2. Guests list ships entire CRM dataset to the client

- **Severity:** critical  
- **Skill prompts:** 5, 52, 80  
- **Place:** `guests/page.tsx`; `ManageGuestsPanel`; `listGuests`  
- **Finding:** Unbounded guests in state; UI pages with `pageRows` but full array kept (also for teams DnD).  
- **Suggested fix:** Server guest paging + search; teams DnD uses slim id/name sets.

### D3. Users + email compose hold all profiles client-side

- **Severity:** critical  
- **Skill prompts:** 5, 6, 52  
- **Place:** `ManageUsersPanel`; `ComposeLetterPanel` / `RecipientToField`; `listUsersForManager` / `listProfiles`  
- **Finding:** Full directory hydrated; compose filters whole array on every keystroke.  
- **Suggested fix:** Paginate users; compose typeahead via server action; bulk-by-role as server ID sets.

### D4. Payment-phase detail loads every SPP for the phase

- **Severity:** high  
- **Skill prompts:** 5, 52  
- **Place:** `accounting/phases/[id]/page.tsx`; `listSppsByPaymentPhaseId`; `PaymentPhaseDetailsPanel`  
- **Finding:** Unbounded SPP select; client filters/paginates in memory.  
- **Suggested fix:** Server-page SPPs with search/status filters.

### D5. Income analytics tables serialize full period arrays to the client

- **Severity:** high  
- **Skill prompts:** 5, 52  
- **Place:** `getIncomeStatementAnalyticsTablesForManager`; `IncomeStatementAnalyticsTablesClient`  
- **Finding:** Full payments/transactions/unpaid/adjusted arrays for the period; UI pagination only slices after hydrate.  
- **Suggested fix:** Server-page each tab table (or server actions keyed by year/month/tab).

### D6. Registrations render up to 500 rows with no UI pagination

- **Severity:** high  
- **Skill prompts:** 5, 12  
- **Place:** `listRegistrationApplicationsForManager` (`limit: 500`); `ManageRegistrationsPanel` (`filtered.map` full tbody)  
- **Finding:** Up to 500 interactive rows rendered after client filter.  
- **Suggested fix:** Real paging (e.g. 25/page) server-side.

### D7. Audit logs accumulate pages in memory and re-filter everything

- **Severity:** high  
- **Skill prompts:** 5, 6  
- **Place:** `ManageLogsPanel` (`setLogs(prev => [...prev, ...page])`, `filteredLogs` over full `logs`)  
- **Finding:** “Load more” grows one client array; search scans all of it every keystroke.  
- **Suggested fix:** Server-side filters + cursor; keep only current page in state.

### D8. Class grades table renders every student (no paging)

- **Severity:** high  
- **Skill prompts:** 5, 12, 1  
- **Place:** `ClassStudentGradesSection` (pending/computed/batch/unready maps)  
- **Finding:** Full class roster tables with actions/`Can` per row.  
- **Suggested fix:** Paginate or virtualize; hoist permission checks out of the row loop.

### D9. Search inputs lack debounce on high-volume panels

- **Severity:** high  
- **Skill prompts:** 6  
- **Place:** `ManageStudentsPanel`, `ManageGuestsPanel`, `ManageUsersPanel`, `ManageLogsPanel`, `ManageAccountingPanel`, `ManageRegistrationsPanel`, `PaymentPhaseDetailsPanel` (contrast: notifications / instructor schedule details already debounce)  
- **Finding:** Every keystroke refilters full in-memory arrays.  
- **Suggested fix:** Shared `useDebouncedValue` (~200–300ms); pair with server search when lists are paged.

### D10. Per-row `<Can>` wrappers in dense tables

- **Severity:** high  
- **Skill prompts:** 1, 12  
- **Place:** `GuestRecordsTable`; `ClassStudentGradesSection`; `ClassStudentsSection`; `WorkshopCard`; `ManageAccountingPanel` phase rows  
- **Finding:** Each row/card mounts `Can` → `usePermissions()`; multiplies work on search/page updates.  
- **Suggested fix:** Resolve booleans once at panel level; pass `canEdit` / `canDelete` into rows (same pattern as income transactions).

### D11. Workshop detail payments tab loads and renders all payments

- **Severity:** medium  
- **Skill prompts:** 5, 13  
- **Place:** `WorkshopPaymentsSection`  
- **Finding:** Full payment list fetched and mapped with no paging; loads with tab UI.  
- **Suggested fix:** Page server-side; fetch only when payments tab selected.

### D12. Subjects catalog holds full categories/exercises + live filter

- **Severity:** medium  
- **Skill prompts:** 5, 6, 42  
- **Place:** `SubjectsCatalogPanel`  
- **Finding:** Entire catalog in client state; search refilters immediately; TipTap rides along via dialog.  
- **Suggested fix:** Server filter/page; debounce search; dynamic TipTap dialog.

### D13. Academic analysis holds all students client-side

- **Severity:** medium  
- **Skill prompts:** 5, 52  
- **Place:** `AcademicAnalysisPanel`  
- **Finding:** Full `data.students` + client filter/page; route also pulls chart UI.  
- **Suggested fix:** Server-page student table; keep aggregates separate from roster payload.

---

## E. JavaScript, Bundles & Build

Skill prompts: 36–46 (code-split, dead deps, lazy heavy libs, tree-shake).

### E1. TipTap statically imported on blogs, catalog, and compose

- **Severity:** high  
- **Skill prompts:** 36, 42  
- **Place:** `tiptap-email-editor.tsx`, `tiptap-exercise-editor.tsx` → blogs sheets, `ExerciseFormDialog`, `ComposeLetterPanel`  
- **Finding:** TipTap + extensions load with list/catalog/compose even when no editor is open.  
- **Suggested fix:** `next/dynamic(..., { ssr: false })` from sheets/dialogs only after open.

### E2. Recharts statically pulled into student detail class tabs

- **Severity:** high  
- **Skill prompts:** 42, 13  
- **Place:** `StudentJoinedClassesSection` → attendance/tasks/course-grade sections → `ClassLineChart` / recharts  
- **Finding:** Student detail downloads chart code for collapsible tabs that may never open.  
- **Suggested fix:** Dynamic-import chart sections when tab/section opens.

### E3. Session/task analytics + AI usage static-import Recharts

- **Severity:** medium  
- **Skill prompts:** 42  
- **Place:** `SessionTaskAnalyticsSection`; `cloudflare-ai-usage-analytics.tsx`; student class grade panels  
- **Finding:** Chart library in initial client chunk for optional analytics.  
- **Suggested fix:** Dynamic import chart modules behind section mount.

### E4. Eager mutation dialogs on list routes

- **Severity:** medium  
- **Skill prompts:** 42, 13  
- **Place:** e.g. `ManageStudentsPanel` dialogs; `ManageBlogsPanel` TipTap sheets; `SubjectsCatalogPanel` exercise dialog  
- **Finding:** Dialog modules (and heavy deps) in list-page graph before open.  
- **Suggested fix:** Dynamic-import when `open` becomes true.

### E5. Income analytics panel statically imports heavy tables module

- **Severity:** medium  
- **Skill prompts:** 36, 42  
- **Place:** `IncomeStatementAnalyticsPanel` imports Etkan/Students tabs for unused `!tablesSlot` fallback  
- **Finding:** Summary shell client chunk still depends on large tables module.  
- **Suggested fix:** Remove unused fallback, or dynamic-import tabs only when needed.

### E6. Root `QueryProvider` wraps the whole app

- **Severity:** medium  
- **Skill prompts:** 36  
- **Place:** `app/layout.tsx` → `QueryProvider`  
- **Finding:** React Query ships on public + panel routes even when unused.  
- **Suggested fix:** Mount only under layouts that need it.

---

## F. Perceived Performance & Loading UX

Skill prompts: 14–24 (skeletons, prefetch, stream, route loading, shell).

### F1. Panel table `<Link>`s omit `prefetch={false}`

- **Severity:** high  
- **Skill prompts:** 16  
- **Place:** `ManageStudentsPanel` / `ManageUsersPanel` detail links; `ClassStudentGradesSection` / `ClassStudentsSection` links; equipment/accounting/project tables; some registration links  
- **Finding:** Default App Router prefetch warms many heavy detail RSC payloads from table viewports. Guests already use `prefetch={false}` in places.  
- **Suggested fix:** `prefetch={false}` on all panel table/detail navigators (session-auth rule).

### F2. Student detail blocks until all sections are fetched

- **Severity:** high  
- **Skill prompts:** 17, 19, 20, 24  
- **Place:** `students/[id]/page.tsx` → `StudentDetailsPanel`  
- **Finding:** Page awaits stats, classes, activity, registration, borrows, then class bundles before any panel HTML.  
- **Suggested fix:** Stream shell + identity first; Suspense activity/borrows/academic tabs (like income analytics `tablesSlot`).

### F3. List pages block on full dataset before render

- **Severity:** medium  
- **Skill prompts:** 17, 21  
- **Place:** students / guests / registrations / users pages  
- **Finding:** RSC awaits entire list then hydrates large client panel; TTFB tracks full-list query.  
- **Suggested fix:** After server paging, optionally stream header/stats vs table body.

---

## G. Images, Fonts & Media

Skill prompts: 25–35.

### G1. Public blog images use raw `<img>` without `next/image`

- **Severity:** medium  
- **Skill prompts:** 25–29  
- **Place:** `components/public/blogs/blog-card.tsx`, `blogs-section.tsx`, `blog-detail-section.tsx`  
- **Finding:** Thumbnails/heroes bypass Next image optimization (unlike other public cards that use `next/image`).  
- **Suggested fix:** Switch to `next/image` with sizes/priority for LCP.

---

## H. Auth / Middleware / Backend concurrency

Skill prompts: 85–94 (offload, pool, degrade); also auth hot-path notes from session rules.

### H1. Middleware always constructs Supabase client

- **Severity:** medium  
- **Skill prompts:** 88, 90  
- **Place:** `middleware.ts`; `createSupabaseMiddlewareClient`  
- **Finding:** Client created before `needsSessionGate`; marketing/static-gated paths still pay cookie/client setup.  
- **Suggested fix:** Early-return before client create when `!needsSessionGate`; tighten matcher if possible.

### H2. Session HIT still pays Supabase client + getClaims every RSC

- **Severity:** low  
- **Skill prompts:** 90  
- **Place:** `lib/auth/session.ts` → `loadSessionPack`; `createSupabaseServerComponentClient`  
- **Finding:** Shell HIT avoids profile/permissions DB, but every pack still builds cookie client + verifies claims (intentional). JWKS sharing looks correct.  
- **Suggested fix:** Do not chase unless timing shows `session_client`/`claims` regressions; keep JWT role in claims.

---

## I. Measurement, Monitoring & Budgets

Skill prompts: 95–100.

### I1. No automated performance budget / RUM wired in-repo

- **Severity:** low  
- **Skill prompts:** 95, 96, 100  
- **Place:** CI / app instrumentation (gap)  
- **Finding:** No in-repo RUM, Lighthouse CI gate, or bundle budget check found as part of this scan.  
- **Suggested fix:** Add Web Vitals reporting + CI budget on main panel routes / initial JS size after the critical/high backlog is underway.

---

## Suggested fix order

Work top-down; each item is independently shippable.

1. **Correctness first (critical DB truncation):** A1–A5  
2. **Stop shipping whole tables to the client:** D1–D3, A8, B1  
3. **Auth Admin / email scans:** B3–B4, B2  
4. **Aggregates instead of row dumps:** A6–A7, A9–A11  
5. **Bundle: TipTap + Recharts dynamic import:** E1–E2  
6. **Debounce + hoist `<Can>` + `prefetch={false}`:** D9–D10, F1  
7. **Streaming student detail / list Suspense:** F2–F3  
8. **Cache invalidation blast radius:** C1–C2  
9. **Medium cleanup:** remaining B/D/E/G/H items  
10. **Budgets / RUM:** I1  

---

## How to use with the skill

- This report is the **backlog**.  
- [`performance-audit.md`](./performance-audit.md) is the **unattended 100-prompt apply loop**.  
- When auto-applying, prefer prompts that match open findings above; mark N/A when already fixed or not applicable.  
- Do not re-open the “Recently fixed” income-statement items unless a regression appears.
