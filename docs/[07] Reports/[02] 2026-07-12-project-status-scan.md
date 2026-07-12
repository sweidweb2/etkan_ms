# [02] Project Status Scan — 2026-07-12

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-07-12  
**Purpose:** Full-repo scan of architecture, backend wiring, build health, security, and remaining gaps — follow-up to [[01] Backend Readiness Audit](./%5B01%5D%202026-07-09-backend-readiness-audit.md) (2026-07-09).

---

## Executive summary

In three days since the July 9 readiness audit, the **manager panel moved from mostly-mock to mostly-real Supabase**. Operational CRUD (users, students, subjects, phases, classes/sessions/tasks/grades, equipment, accounting, schedule, notifications, relationships, audit logs, cron jobs, backup, settings) is wired through **24 services**, **29 repositories**, and **15 server-action modules**.

**Still mock/preview:** manager dashboard, analytics, reports, accounting analysis, user detail page, and a few student/subject subsections. **Teacher, student, admin, and CEO panels** remain placeholder shells.

**Build health (this scan):**

| Check | Result |
|-------|--------|
| `npm run typecheck` | **24 errors** in 15 files (was 7 backup-only on July 9; regressions elsewhere) |
| ESLint | **28 errors**, **17 warnings** (was 0 errors / 10 warnings) |
| `npm test` | **39/40** files pass; **320 tests** pass; 1 suite fails (`borrow-equipment.service.test.ts` — `server-only` import) |

**Security:** RLS still on **3 tables only**. Manager data access relies on the **service-role admin client** + service-layer role checks. That pattern works for a manager-only server app but is not enough for teacher/student clients or public anon access.

**Recommendation:** Fix typecheck/ESLint blockers, add domain RLS (or formally document admin-client-only forever), finish remaining manager mock surfaces, then start teacher/student panels.

---

## Progress vs July 9 audit

| Area (July 9) | Then | Now (July 12) |
|---------------|------|----------------|
| Production services | 5 | **24** |
| Repositories | 8 | **29** |
| Server action modules | 4 | **15** |
| Manager domains on Supabase | Auth, settings, backup | **Most CRUD domains** |
| Mock constants on disk | ~38 | **33** (many unused/legacy) |
| Preview helpers | ~22 | **21** |
| sessionStorage preview stores | 7 | **7** (still present) |
| Migrations | ~9 | **10** |
| Tables in `types/supabase.ts` | 28 | **29** (+ `account_special_cases`) |
| RLS coverage | 3 tables | **Still 3 tables** |
| Typecheck | 7 errors (backup) | **24 errors** (backup + UI/validators/export) |
| ESLint errors | 0 | **28** |
| Phase 2–5 wiring (entities → accounting) | Planned | **Largely done** |
| Phase 6 reporting / Phase 7 roles | Planned | **Still open** |

---

## 1. Architecture inventory

### 1.1 Layers

| Layer | Count | Notes |
|-------|------:|-------|
| Production services (`*.service.ts`) | 24 | Business logic; no direct Supabase |
| Service tests (`*.test.ts`) | 19 | Plus lib/unit tests → 40 test files total |
| Repositories | 29 | Sole Supabase access layer |
| Server actions (`app/**/actions.ts`) | 15 | 3 auth + 12 manager |
| API routes | 2 | Backup export; navbar auth state |
| Migrations | 10 | Initial schema + 9 follow-ups |
| Public tables (generated types) | 29 | Includes `account_special_cases` |

### 1.2 Production services

`accounting`, `auth`, `audit-log`, `backup`, `backup-history`, `borrow-equipment`, `class`, `class-computed-grade-lock`, `cron-job`, `equipment`, `notification`, `profile`, `relationship`, `role`, `semester`, `session`, `student`, `student-course-grade`, `student-semester`, `subject`, `subscribed-semester`, `user`, `user-display`, `weekly-schedule-slot`

### 1.3 Repositories

`account`, `account-special-case`, `app-settings`, `attendee`, `audit-log`, `auth`, `backup`, `backup-history`, `borrow-equipment`, `class`, `class-teacher`, `equipment`, `final-exam`, `notification`, `payment`, `profile`, `relationship`, `scheduled-payment`, `semester`, `session`, `student-class`, `student-course-grade`, `student-profile`, `student-semester`, `student-task`, `subject`, `subscribed-semester`, `task`, `weekly-schedule-slot`

### 1.4 Server actions

| Module | Path |
|--------|------|
| Auth shared / login / signup | `app/auth/actions.ts`, `login/actions.ts`, `signup/actions.ts` |
| Users | `app/manager/users/actions.ts` |
| Students | `app/manager/students/actions.ts` |
| Subjects | `app/manager/subjects/actions.ts` |
| Classes + grades | `app/manager/classes/actions.ts`, `classes/grades/actions.ts` |
| Phases / semesters | `app/manager/phases/actions.ts` |
| Equipment | `app/manager/equipments/actions.ts` |
| Accounting | `app/manager/accounting/actions.ts` |
| Schedule | `app/manager/schedule/actions.ts` |
| Notifications | `app/manager/notifications/actions.ts` |
| Relationships | `app/manager/relationships/actions.ts` |
| Settings | `app/manager/settings/actions.ts` |

### 1.5 Role panels (pages)

| Role | Pages | Backend maturity |
|------|------:|------------------|
| Manager | ~32 | Mostly real services |
| Teacher | 8 | Placeholder shells |
| Student | 6 | Placeholder shells |
| CEO | 9 | Placeholder shells |
| Admin | 2 | Placeholder shells |
| Auth | 2 + callback | Real |
| Maintenance | 1 | Real (middleware + settings) |

---

## 2. Manager domain: mock vs real

| Domain | Status |
|--------|--------|
| Auth / login / signup / logout | **Real** |
| Users list + create | **Real** |
| User detail `/manager/users/[id]` | **Mock/preview** |
| Students list / create / update / core detail | **Real** |
| Student join-class picker + borrowed equipment section | **Mock/preview** |
| Subjects list / detail / classes | **Real** |
| Subject grades subsections | **Mock** |
| Semesters / phases / enrollments / progress | **Real** |
| Classes / sessions / tasks / attendance / final exam / grades | **Real** |
| Equipment + borrow | **Real** |
| Accounting list + student account + mutations | **Real** |
| Accounting analysis | **Mock/preview** |
| Schedule | **Real** |
| Notifications | **Real** |
| Relationships | **Real** |
| Audit logs | **Real** |
| Cron jobs UI | **Real** |
| Settings / maintenance / backup | **Real** |
| Dashboard | **Mock** |
| Analytics | **Mock** |
| Reports | **Mock** |

### Legacy mock debt still on disk

| Category | Count | Location |
|----------|------:|----------|
| `manager-*-mock.ts` constants | 33 | `lib/constants/` |
| `get-*-preview.ts` helpers | 21 | `lib/manager/` |
| sessionStorage preview stores | 7 | `lib/preview/` |

Many mocks remain as leftover seed data after domains were wired. Cleanup is safe once remaining mock UI paths are replaced.

---

## 3. Database & migrations

### 3.1 Migration files (10)

| File | Theme |
|------|-------|
| `20260602202331_initial.sql` | Full schema + only RLS block |
| `20260711000000_cron_mark_overdue_pending_missing.sql` | Overdue tasks/final-exam → `missing` |
| `20260712000000_drop_class_weights_and_course_grade_columns.sql` | Drop flat grade / class_weights columns |
| `20260713000000_add_student_course_grade_json_columns.sql` | `group_grades_json`, `attendee_grades_json` |
| `20260714000000_cron_notify_manager_payment_alerts.sql` | Payment-alert cron (later removed) |
| `20260715000000_account_special_cases.sql` | Special-case billing + cron |
| `20260716000000_account_special_cases_status.sql` | `active` / `inactive` on special cases |
| `20260717000000_drop_cron_notify_manager_payment_alerts.sql` | Drop payment-alert cron |
| `20260718000000_subscribed_semester_status_lifecycle.sql` | `pending \| paid \| paused \| stopped \| refunded` |
| `20260719000000_semester_status_lifecycle.sql` | `scheduled \| in_progress \| stopped \| paused \| done` |

### 3.2 Schema notes

- **29** public tables in generated types (28 initial + `account_special_cases`).
- `student_takeouts` exists in schema but has **no repository, service, or UI**.
- Grade model evolved: flat columns removed → JSON grade columns on `student_course_grade`.
- Semester / subscribed-semester status enums tightened in latest migrations (UI still has some stale `"active"` / `"overdue"` comparisons — see §4).

---

## 4. Build & test health

### 4.1 TypeScript — 24 errors in 15 files

| Cluster | Files | Issue |
|---------|-------|-------|
| Backup typing (carry-over) | `app/api/manager/backup/route.ts`, `app/manager/backup/page.tsx` | Custom `BackupClient` / `BackupHistoryClient` vs real `SupabaseClient` chain; implicit `any[]` history |
| Status lifecycle drift | `student-account-details-panel.tsx` | Compares status to `"active"` / `"overdue"` after enum change |
| InlineSpinner API | equipment + phase dialogs (5 files) | Passing `label` prop that does not exist |
| Borrow edit dialog | `edit-borrow-record-dialog.tsx` | `unknown` quantity; `FieldLabel` missing required `hint` |
| Equipment actions | `equipments/actions.ts` | `fieldErrors` not on `ToggleBorrowReturnedActionState` |
| Validators | `add-student-to-semester.ts`, `connect-semester-class.ts` | ZodError passed where `Record<field, string[]>` expected |
| Export | `student-grade-sheet-export.ts` | `fontStyle: string` not assignable to jsPDF `FontStyle` |
| Chart keys | `class-line-chart.tsx` | Recharts key typing |
| Legacy mock | `manager-class-session-detail-mock.ts` | `status: boolean` vs `AttendeeStatusValue` |

### 4.2 ESLint — 28 errors, 17 warnings

Notable blocker pattern: `react-hooks/set-state-in-effect` (e.g. `panel-collapsible-nav-group.tsx`). Remaining issues include unused vars in mocks/services and similar React Compiler / hooks rules across manager UI.

### 4.3 Tests

| Metric | Value |
|--------|------:|
| Test files passed | 39 / 40 |
| Tests passed | 320 |
| Failed suite | `services/borrow-equipment.service.test.ts` |

**Failure cause:** importing a module guarded by `server-only` into the Vitest graph. Fix by mocking `server-only` in test setup or restructuring the import boundary.

---

## 5. Auth & security

### 5.1 Middleware (working)

- Resolves session via Supabase middleware client; role via `resolveUserRole`.
- Panel roots (`admin`, `manager`, `ceo`, `teacher`, `student`) require login; wrong role → own dashboard.
- Guest-only auth routes redirect logged-in users.
- **Maintenance mode** blocks teacher/student (and their panels when logged out); allows `/maintenance`, manager settings, and auth routes.

### 5.2 RLS — still critical gap

Enabled only on:

| Table | Policies |
|-------|----------|
| `profiles` | select/update own |
| `student_profiles` | select/update own |
| `app_settings` | public select |

**~26 domain tables have no RLS.** Manager reads/writes go through `createSupabaseAdminClient()` (service role), which bypasses RLS. Service-layer role checks are the primary authorization gate today.

### 5.3 Layering exceptions

- Settings page reads `app-settings.repository` from the page (bypasses services).
- Admin client is correctly guarded with `server-only` (July 9 fix still in place).

---

## 6. Known gaps & risks

### 6.1 High priority

1. **Restore green typecheck** — 24 errors (backup + post-wiring regressions).
2. **Restore green lint** — 28 ESLint errors.
3. **RLS strategy** — policies for all domain tables, or an explicit documented decision that manager remains admin-client-only forever.
4. **Fix `borrow-equipment` test** — `server-only` boundary.

### 6.2 Manager polish (still mock)

1. Dashboard aggregations  
2. Analytics  
3. Reports  
4. Accounting analysis  
5. User detail page  
6. Student borrowed-equipment + join-class UX leftovers  
7. Subject grades subsections  
8. Delete unused mock/preview/sessionStorage files after the above

### 6.3 Schema / product leftovers

| Item | Gap |
|------|-----|
| `student_takeouts` | Table only — no app layer |
| Payment-alert cron | Added then dropped (20260717); overdue-missing cron remains |
| Status enums | DB migrated; some UI still uses old literals |
| `class-final-exam.service.test.ts` | Tests `class.service` APIs under a mismatched filename |

### 6.4 Other roles (Phase 7)

Teacher, student, admin, and CEO panels are route shells only. No role-specific services beyond shared auth/role resolution.

---

## 7. Recommended next order

### Phase A — Stabilization (this week)

1. Fix backup repository typing (`SupabaseClient<Database>`).
2. Align UI with subscribed-semester / semester status enums.
3. Fix `InlineSpinner` / `FieldLabel` / validator / export type errors.
4. Clear ESLint errors (especially set-state-in-effect).
5. Fix or isolate `borrow-equipment.service.test.ts`.

### Phase B — Security

1. Design manager RLS policies (or document admin-client-only + harden that every mutation stays server-side).
2. Ensure no client components import repositories or admin client.

### Phase C — Finish manager mocks

1. User detail → `user.service`  
2. Dashboard / analytics / reports / accounting analysis aggregations  
3. Remove dead `lib/constants/*mock*`, `lib/manager/*preview*`, `lib/preview/*`

### Phase D — Other roles

1. Teacher panel (classes, attendance, grades entry)  
2. Student panel (classes, finance, grades view)  
3. CEO / admin analytics extensions  

---

## 8. Quick reference

| Path | Role (July 12) |
|------|----------------|
| `services/` | 24 production services |
| `repositories/` | 29 data-access modules |
| `app/manager/**/actions.ts` | 12 manager action modules |
| `app/api/` | backup + navbar-state |
| `supabase/migrations/` | 10 files |
| `types/supabase.ts` | 29 public tables |
| `lib/constants/manager-*-mock.ts` | 33 legacy mocks |
| `lib/manager/get-*-preview.ts` | 21 preview helpers |
| `lib/preview/` | 7 sessionStorage stores |
| `docs/[07] Reports/[01]…` | Prior readiness audit (partially outdated) |

---

## 9. Conclusion

Etkan MS is **past the “ready to wire backend” stage** described on July 9. The manager operational core is **largely on Supabase**. The project is **not deploy-ready**: typecheck and ESLint are red, RLS is still minimal, mock debt remains on analytics/reporting surfaces, and non-manager roles are shells.

**Nearest milestone:** green `typecheck` + green `lint` + explicit RLS decision.  
**Next product milestone:** replace remaining manager mocks, then open teacher/student panels on the same service layer.
