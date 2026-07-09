# [01] Backend Readiness Audit — 2026-07-09

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-07-09  
**Purpose:** Pre-backend scan — critical errors, missing pieces, and recommended wiring order before replacing mock/preview data with Supabase.

---

## Executive summary

The manager panel UI is **feature-rich and largely aligned with the database schema**, but **backend integration is minimal**. Only **auth**, **manager settings** (maintenance mode + credentials), and **backup export** talk to Supabase today. The entire manager domain (users, students, semesters, classes, grades, equipment, accounting, analytics, etc.) runs on **mock constants** and **`lib/manager/*-preview.ts` helpers**, with some **sessionStorage** preview stores for mutations.

**Build status:** `npm run build` will **fail** due to **74 TypeScript errors** across 20 files. ESLint reports **27 errors** and 32 warnings.

**Security status:** Row Level Security (RLS) is enabled on **3 tables only** (`profiles`, `student_profiles`, `app_settings`). ~25 domain tables have **no RLS policies** — wiring them without policies would be a critical security risk.

**Recommendation:** Fix compile-time blockers first, then regenerate Supabase types, add RLS + manager policies, then wire backend in the order listed in [Section 6](#6-recommended-backend-wiring-order).

---

## 1. What is working (real Supabase)

| Area | Status | Key files |
|------|--------|-----------|
| Auth (login, signup, logout) | Real | `app/auth/*/actions.ts`, `services/auth.service.ts`, `repositories/auth.repository.ts` |
| Profile + student profile on signup | Real | `services/profile.service.ts`, `repositories/profile.repository.ts`, `repositories/student-profile.repository.ts` |
| Role resolution | Real | `services/role.service.ts`, `middleware.ts` |
| Maintenance mode | Real | `app/manager/settings/actions.ts`, `repositories/app-settings.repository.ts` |
| Manager self-credentials | Real | `app/manager/settings/actions.ts` |
| Backup export | Real (with TS errors) | `app/api/manager/backup/route.ts`, `services/backup.service.ts` |
| Route protection | Real | `middleware.ts`, `lib/auth/path-access.ts` |

**Server actions:** 4 files only (`app/auth/*`, `app/manager/settings/actions.ts`).  
**API routes:** 1 domain route (`app/api/manager/backup/route.ts`).  
**Repositories:** 6 files.  
**Services:** 5 production services (+ tests).

---

## 2. Critical errors (build-blocking)

Verified via `npx tsc --noEmit` on 2026-07-09: **74 errors in 20 files**.

### 2.1 Backup — Supabase client type mismatch (10 errors)

| File | Errors |
|------|--------|
| `app/api/manager/backup/route.ts` | 4 |
| `app/manager/backup/page.tsx` | 3 |

**Cause:** Custom `BackupClient` / `BackupHistoryClient` types in `repositories/backup.repository.ts` and `repositories/backup-history.repository.ts` model `.select()` / `.insert()` as returning a `Promise` directly. The real Supabase client returns a `PostgrestFilterBuilder` chain.

**Fix:** Accept `SupabaseClient<Database>` in repositories, or add a thin adapter. Type `history` on the backup page (avoid implicit `any[]`).

### 2.2 Zod 4 + react-hook-form resolver mismatch (34 errors)

**Cause:** Validators use `z.coerce.number()` (and similar). In Zod 4, coerce fields infer **input** as `unknown` while `z.infer<>` gives **output** (`number`). `useForm<OutputType>()` + `zodResolver` fails because resolver expects input types.

**Affected production files:**

| File | Errors |
|------|--------|
| `components/manager/accounting/add-payment-dialog.tsx` | 2 |
| `components/manager/accounting/edit-payment-dialog.tsx` | 2 |
| `components/manager/accounting/add-scheduled-payment-dialog.tsx` | 2 |
| `components/manager/accounting/edit-scheduled-payment-dialog.tsx` | 2 |
| `components/manager/accounting/edit-subscribed-semester-dialog.tsx` | 2 |
| `components/manager/classes/add-session-task-dialog.tsx` | 3 |
| `components/manager/classes/create-final-exam-dialog.tsx` | 5 |
| `components/manager/classes/edit-student-task-sheet.tsx` | 3 |
| `components/manager/classes/edit-student-finalexam-grade-sheet.tsx` | 3 |
| `components/manager/equipments/add-equipment-dialog.tsx` | 2 |
| `components/manager/equipments/edit-equipment-dialog.tsx` | 2 |
| `components/manager/phases/add-phase-dialog.tsx` | 2 |

**Validators involved:** `lib/validators/manager/add-payment.ts`, `update-payment.ts`, `scheduled-payment.ts`, `update-subscribed-semester.ts`, `create-phase.ts`, `create-equipment.ts`, `create-session-task.ts`, `create-final-exam.ts`, etc.

**Fix (pick one project-wide pattern):**

- `useForm<z.input<typeof schema>>()` and parse output in `onSubmit`, or
- Export explicit form value types from validators, or
- Replace `z.coerce.number()` with `z.number()` + `valueAsNumber` on inputs.

### 2.3 Test mocks incomplete (30 errors)

| File | Errors |
|------|--------|
| `services/profile.service.test.ts` | 19 |
| `services/auth.service.test.ts` | 6 |
| `services/user-display.service.test.ts` | 6 |
| `services/role.service.test.ts` | 4 |

**Cause:** Mock `{ data, error }` objects missing `success`, `count`, `status`, `statusText` required by newer Supabase response types. Tests are included in `tsconfig.json` and therefore block production build.

**Fix:** Update mocks to full response shape, or exclude `**/*.test.ts` from the production TypeScript project.

### 2.4 Other production TS errors (2 errors)

| File | Issue |
|------|-------|
| `components/manager/dashboard/manager-dashboard-panel.tsx` | `stat.value` is `number \| string` but `UserStatCard` expects `number` |
| `components/manager/classes/session-details-actions.tsx` | `FieldLabel` missing required `htmlFor` |

---

## 3. ESLint issues (27 errors)

`npm run lint` reports **59 problems** (27 errors, 32 warnings).

Notable patterns:

- **`react-hooks/set-state-in-effect`** — many manager panels call `setState` synchronously inside `useEffect` (including `student-account-details-panel.tsx`).
- **`react-hooks/incompatible-library`** — accounting form dialogs use `watch()` (React Compiler warning).
- **`prefer-const`** — `lib/supabase/middleware.ts`.

ESLint may or may not block `next build` depending on config, but these should be cleaned up for maintainability.

---

## 4. Backend gaps — mock vs real

### 4.1 Mock / preview data inventory

| Layer | Count | Location |
|-------|-------|----------|
| Mock constant files | 38 | `lib/constants/manager-*-mock.ts` |
| Preview helpers | 22 | `lib/manager/get-*-preview.ts` |
| SessionStorage stores | 7 | `lib/preview/*-store.ts` |
| Unwired Zod validators | 29 | `lib/validators/manager/*.ts` |

### 4.2 Manager features still on mocks (all Critical for backend)

| Domain | UI entry | Data source |
|--------|----------|-------------|
| Dashboard | `manager-dashboard-panel.tsx` | `manager-dashboard-mock.ts` |
| Users | `manage-users-panel.tsx` | `manager-users-mock.ts` |
| Students | `manage-students-panel.tsx` | `manager-students-mock.ts` |
| Semesters / phases | `manage-phases-panel.tsx` | `manager-phases-mock.ts`, `manager-student-semester-mock.ts` |
| Subjects | `manage-subjects-panel.tsx` | `manager-subjects-mock.ts` |
| Classes | `manage-classes-panel.tsx` | `manager-classes-list-mock.ts` |
| Sessions & tasks | `class-sessions-section.tsx` | mocks + `lib/preview/manager-session-tasks-store.ts` |
| Attendance | `session-details-tabs-section.tsx` | `manager-class-session-detail-mock.ts` |
| Grades / weights | `class-student-grades-section.tsx` | mocks + `manager-class-weights-store.ts` |
| Final exam | `class-final-exam-section.tsx` | mocks + sessionStorage stores |
| Equipment | `manage-equipments-panel.tsx` | `manager-equipments-mock.ts` |
| Accounting | `manage-accounting-panel.tsx` | `get-manager-accounting-students-preview.ts`, `manager-student-account-mock.ts` |
| Accounting analysis | `manage-accounting-analysis-panel.tsx` | `get-manager-accounting-analytics-preview.ts` |
| Relationships | `manage-relationships-panel.tsx` | `manager-relationships-mock.ts` |
| Notifications | `manage-notifications-panel.tsx` | `manager-notifications-mock.ts` |
| Audit logs | `manage-logs-panel.tsx` | `manager-audit-logs-mock.ts` |
| Schedule | `manager-schedule-panel.tsx` | `manager-weekly-schedule-mock.ts` |
| Analytics | `manager-analytics-panel.tsx` | `manager-analytics-mock.ts` |
| Reports | `manager-reports-panel.tsx` | `manager-reports-mock.ts` |

### 4.3 Role panels (placeholders)

`app/admin/`, `app/ceo/`, `app/teacher/`, `app/student/` — mostly shell pages with no data layer. **Medium** priority relative to manager backend.

### 4.4 Missing service / repository / action layers

Validators exist for nearly all manager CRUD, but **no corresponding**:

- `repositories/*.repository.ts` for domain tables
- `services/*.service.ts` for business logic
- `app/manager/*/actions.ts` server actions

**Exception:** `createAuthUser` exists in `repositories/auth.repository.ts` but manager add-user UI is still preview-only.

---

## 5. Database vs application alignment

### 5.1 Tables in migrations (28 tables)

From `supabase/migrations/`:

`profiles`, `student_profiles`, `relationships`, `equipments`, `accounts`, `semesters`, `subscribed_semesters`, `payments`, `scheduled_payments`, `subjects`, `classes`, `class_teacher`, `student_class`, `sessions`, `tasks`, `student_tasks`, `student_course_grade`, `borrow_equipment`, `student_takeouts`, `audit_logs`, `backup_history`, `app_settings`, `notifications`, `attendee`, `student_semester`, `final_exam`, `student_finalexam_grade`, `class_weights`

### 5.2 Tables queried by app code (4 tables)

Only these are read/written in repositories or app code today:

- `profiles`
- `student_profiles`
- `app_settings`
- `backup_history`

All other tables exist in schema but are **unused** in application code (backup export reads many via admin client, but normal app flow does not).

### 5.3 Stale generated types

`types/supabase.ts` types only **3 tables** (`profiles`, `student_profiles`, `app_settings`). All domain tables are untyped in the client layer.

**Action:** Regenerate types from current migrations (`supabase gen types typescript`).

### 5.4 Backup table list incomplete

`lib/constants/backup-tables.ts` is **missing** tables that exist in schema:

- `sessions`
- `attendee`
- `final_exam`
- `student_finalexam_grade`
- `class_weights`
- `student_semester`
- `notifications`
- `backup_history` (table exists; not in export list)

Admin full backup is **incomplete** relative to schema. **High** severity.

### 5.5 Schema / UI drift

| Area | DB schema | UI / mock | Risk |
|------|-----------|-----------|------|
| Attendance | `attendee.status` boolean (`20260709180000`) | Mock uses `is_active` on `ManagerSessionAttendeeRow` | Medium — mapping needed on wire-up |
| Class status | `scheduled/in_progress/done/paused/stopped` (`20260709180500`) | Preview helpers in `manager-class-status.ts` | Medium — verify enum alignment |
| Accounting signup | `accounts` table exists | Signup creates profile + student_profile only, **no account row** | **Critical** — no billing entry for new students |
| Subscribed phases rename | `subscribed_semesters` (`20260709184000`) | UI already uses semester naming | OK |
| Scheduled payments | `scheduled_payments` (`20260709185000`) | Mock only | Critical — table unused |

---

## 6. Security and architecture concerns

### 6.1 RLS coverage (Critical)

RLS enabled **only** on:

- `profiles` — select/update own row
- `student_profiles` — select/update own row
- `app_settings` — public select only

**~25 domain tables have no RLS.** Before any manager CRUD hits Supabase from the browser client, policies (or exclusive server-side admin client + authorization checks) are required.

### 6.2 Manager user listing

`profiles` RLS is self-only — managers **cannot** list other users via the session client. User management will need either:

- New RLS policies for manager role, or
- Server-only admin client with service-layer role checks

### 6.3 Architecture violation

`components/layout/site-navbar.tsx` queries `profiles` via browser Supabase client — violates project rule: **components must not access Supabase directly**.

### 6.4 Audit logging

`audit_logs` table exists; **no app inserts** and **no DB triggers**. Manager mutations have no compliance trail.

### 6.5 Admin client blast radius

Signup rollback, maintenance writes, and backup use `createSupabaseAdminClient()`. Correct if server-only; high risk if ever exposed to client bundles.

---

## 7. Missing infrastructure / docs

| Item | Status |
|------|--------|
| `.env.example` | **Missing** — no env template in repo |
| `lib/services/` | Not used — services live in root `services/` (OK per architecture) |
| Dedicated `typecheck` script | **Missing** from `package.json` |
| `docs/reports/` | Created with this report |
| Existing docs | `docs/database/`, `docs/config/supabase-auth.md`, `docs/cmds/` — schema and auth documented |

---

## 8. Recommended backend wiring order

### Phase 0 — Unblock build (1–2 days)

1. Fix backup repository client types + backup page typing
2. Standardize Zod 4 form input/output types across all manager dialogs
3. Fix or exclude test files from production `tsconfig`
4. Fix dashboard stat card type + `FieldLabel` htmlFor
5. Add `typecheck` script to `package.json`

### Phase 1 — Foundation (before any CRUD)

1. Regenerate `types/supabase.ts` from full schema
2. Design and apply **RLS policies** for manager role (or document admin-client-only pattern)
3. Add `accounts` row creation on student signup
4. Complete `BACKUP_TABLES` list
5. Move `site-navbar.tsx` profile fetch to a server action or layout loader

### Phase 2 — Core entities

1. `semesters` + `student_semester`
2. `subjects` + `classes` + `class_teacher` + `student_class`
3. `sessions` + `tasks` + `student_tasks` + `attendee`

### Phase 3 — Academic grading

1. `class_weights`
2. `final_exam` + `student_finalexam_grade`
3. `student_course_grade`

### Phase 4 — Operations

1. `equipments` + `borrow_equipment`
2. `relationships`
3. `notifications`

### Phase 5 — Accounting (high business value)

1. `accounts` (list/link)
2. `subscribed_semesters`
3. `payments` + `scheduled_payments`
4. Replace `get-manager-accounting-*-preview.ts` with repositories + services
5. Wire accounting analysis aggregations to SQL/RPC

### Phase 6 — Observability & reporting

1. `audit_logs` — triggers or service writes on mutations
2. Dashboard / analytics / reports — server-side aggregations
3. Replace all `lib/preview/*` sessionStorage stores

### Phase 7 — Other roles

1. Teacher panel
2. Student panel
3. CEO / admin extensions

---

## 9. Quick reference — file index

| Path | Role |
|------|------|
| `supabase/migrations/` | Full schema (9 migration files) |
| `repositories/` | Real data access (6 files) |
| `services/` | Real business logic (5 services) |
| `lib/manager/` | Preview data accessors (22 files) |
| `lib/constants/manager-*-mock.ts` | Mock seed data (38 files) |
| `lib/preview/` | sessionStorage mutation stores (7 files) |
| `lib/validators/manager/` | Ready validators, mostly unwired (29 files) |
| `app/api/manager/backup/route.ts` | Sole domain API route |
| `types/supabase.ts` | Stale — 3 tables only |

---

## 10. Conclusion

**You are ready to start backend work**, but not ready to deploy. The UI and schema are well ahead of the data layer; validators and migrations provide a clear contract. Before wiring Supabase:

1. **Fix 74 TypeScript errors** so CI/build passes
2. **Add RLS** — biggest security gap
3. **Regenerate types** and **complete backup table list**
4. **Provision `accounts` on signup** for accounting continuity

The highest-value first backend slice is likely **semesters + student_semester + accounting chain** (`accounts` → `subscribed_semesters` → `payments` / `scheduled_payments`), since recent UI work (manage accounting, student account details, analysis) is already built against that model in mock form.

---

*Report generated from automated project scan: TypeScript check, ESLint, migration review, and codebase exploration.*
