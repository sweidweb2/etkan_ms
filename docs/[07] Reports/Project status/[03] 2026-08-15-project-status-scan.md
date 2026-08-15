# [03] Project Status Scan — 2026-08-15

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-08-15  
**Purpose:** Full-repo scan of architecture, backend wiring, build health, security, and remaining gaps — follow-up to [[02] Project Status Scan](./%5B02%5D%202026-07-12-project-status-scan.md) (2026-07-12) and [[01] Backend Readiness Audit](./%5B01%5D%202026-07-09-backend-readiness-audit.md) (2026-07-09).

---

## Executive summary

In the five weeks since the July 12 scan, Etkan MS went from **“manager CRUD mostly wired, build red”** to **“manager operational core on Supabase, build green.”** Accounting was rebuilt around payment phases, RBAC shipped end-to-end, and large new domains landed (workshops, instructors/schedules + AI assistant, emailing, income statement, gallery, public registration, financial-form invites).

**Still mock / placeholder:** manager **Reports** (mock data), manager **Analytics** (empty rebuild stub), **user detail** (preview user, ignores URL id), and the **student-detail borrowed-equipment** section. **Teacher, student (except Activity), admin, co-manager, and trainer** panels are still heading-only shells. CEO has no own pages — it reuses shared manager workshop/instructor/schedule/AI/income-analytics routes.

**Build health (this scan):**

| Check | Result |
|-------|--------|
| `npm run typecheck` | **0 errors** (was 24 on July 12) |
| ESLint | **0 errors, 0 warnings** (was 28 errors / 17 warnings) |
| `npm test` | **101/101** files pass; **789 tests** pass (was 39/40 files, 320 tests, 1 fail) |

**Security:** Domain data still goes through the **service-role admin client** + **RBAC permission checks** in services. That is now an **intentional hardening model** (documented July 29), not an unfinished Phase 1. Table RLS remains on a handful of tables; most domain tables have none. Gallery / public projects / registration enable RLS **without table policies** (deny-all for anon/authenticated; pages use the admin client).

**Recommendation:** Wire remaining manager mock surfaces (reports, analytics, user detail, student borrow section), connect public `/projects` to `public_projects`, expand backup table coverage, then open teacher/student panels on the existing service layer.

---

## Progress vs July 12 scan

| Area (July 12) | Then | Now (August 15) |
|----------------|------|-----------------|
| Production services | 24 | **44** |
| Repositories | 29 | **48** |
| Server action modules | 15 | **27** (4 public/auth + 23 manager) |
| API routes | 2 | **3** (+ schedule-assistant) |
| Manager domains on Supabase | Most CRUD | **Almost all operational + finance + workshops + RBAC + email + gallery + registrations** |
| Mock constants on disk | 33 | **12** (mostly reports + leftover previews) |
| Preview helpers | 21 | **3** |
| sessionStorage preview stores | 7 | **0** |
| Migrations | 10 | **50** |
| Tables in `types/supabase.ts` | 29 | **47** |
| RBAC catalog | (not shipped) | **139 keys**, Manager Permissions UI, route + service gates |
| RLS coverage | 3 tables with policies | **3 with policies** + 4 more `ENABLE RLS` without table policies |
| Typecheck | 24 errors | **0** |
| ESLint errors | 28 | **0** |
| Tests | 320 pass / 1 suite fail | **789 pass / 0 fail** |
| Phase 6 reporting | Open | **Still open** (reports mock; analytics stub) |
| Phase 7 other roles | Open | **Mostly still open** (shared workshops + student activity only) |

---

## 1. Architecture inventory

### 1.1 Layers

| Layer | Count | Notes |
|-------|------:|-------|
| Production services (`*.service.ts`) | 44 | Business logic; no direct Supabase |
| Test files (`*.test.ts`) | 101 | Services + lib/auth/validators/export |
| Repositories | 48 | Sole Supabase access layer |
| Server actions (`**/actions.ts`) | 27 | 4 public/auth + 23 manager |
| API routes | 3 | Backup export; navbar auth state; schedule assistant |
| Migrations | 50 | Initial schema + 49 follow-ups |
| Public tables (generated types) | 47 | See §3 |
| Permission keys | 139 | `PERMISSIONS` + `PERMISSION_DEFINITIONS` |

### 1.2 Production services

`accounting-recalc`, `accounting-sync`, `audit-log`, `auth`, `authorization`, `backup`, `backup-history`, `borrow-equipment`, `class`, `class-computed-grade-lock`, `cloudflare-ai-usage`, `cron-job`, `email`, `equipment`, `gallery-image`, `income-statement`, `income-statement-analytics`, `instructor`, `instructor-schedule-slot`, `manager-dashboard`, `notification`, `payment-phase`, `profile`, `public-project`, `rbac`, `relationship`, `role`, `schedule-assistant`, `semester`, `session`, `student`, `student-activity`, `student-course-grade`, `student-financial-adjustment`, `student-payment`, `student-registration`, `student-semester`, `student-status`, `subject`, `transaction`, `user`, `user-display`, `weekly-schedule-slot`, `workshop`

July 12 `accounting.service` was replaced by the payment-phase / payment / adjustment / sync / recalc / transaction / income-statement cluster.

### 1.3 Repositories

`app-settings`, `attendee`, `audit-log`, `auth`, `backup`, `backup-history`, `borrow-equipment`, `class`, `class-teacher`, `cloudflare-ai-usage`, `email-sent`, `email-users`, `equipment`, `final-exam`, `gallery-image`, `instructor-schedule-slot`, `instructor-subject-capability`, `notification`, `payment-phase`, `permission`, `profile`, `public-project`, `registration-storage`, `relationship`, `semester`, `session`, `student-class`, `student-course-grade`, `student-financial-adjustment`, `student-financial-form`, `student-financial-form-invite`, `student-payment`, `student-payment-phase`, `student-profile`, `student-registration-application`, `student-registration-document`, `student-semester`, `student-task`, `subject`, `task`, `transaction`, `weekly-schedule-slot`, `workshop`, `workshop-document`, `workshop-instructor`, `workshop-payment`, `workshop-session`, `workshop-storage`

Dropped since July 12: `account`, `account-special-case`, `scheduled-payment`, `subscribed-semester` (accounting rewrite).

### 1.4 Server actions

| Area | Path |
|------|------|
| Auth shared / login / signup | `app/(public)/auth/actions.ts`, `login/actions.ts`, `signup/actions.ts` |
| Public register / financial form | `app/(public)/register/actions.ts`, `app/(public)/f/actions.ts` |
| Users / students / subjects | `app/(panels)/manager/users`, `students`, `subjects` |
| Classes + grades | `classes/actions.ts`, `classes/grades/actions.ts` |
| Semesters | `semesters/actions.ts` |
| Equipment | `equipments/actions.ts` |
| Accounting + income statement | `accounting/actions.ts`, `income-statement/actions.ts` |
| Schedule / instructor schedules | `schedule/actions.ts`, `instructor-schedules/actions.ts` |
| Instructors / workshops | `instructors/actions.ts`, `workshops/actions.ts` |
| Notifications / relationships | `notifications/actions.ts`, `relationships/actions.ts` |
| Emailing / sent | `emailing/actions.ts`, `sent/actions.ts` |
| Gallery / projects | `gallery/actions.ts`, `projects/actions.ts` |
| Registrations / logs / RBAC / settings | `registrations`, `logs`, `rbac`, `settings` |

### 1.5 Role panels (pages)

| Role | Pages | Backend maturity |
|------|------:|------------------|
| Manager | ~48 | Almost all real services |
| CEO | 1 (redirect) + shared manager routes | Real **shared** instructor / workshop / schedule / AI / income-analytics |
| Teacher | 8 | Placeholder shells (+ shared workshops if `is_instructor`) |
| Student | 7 | **Activity is real**; rest placeholder (+ shared workshops if instructor) |
| Co-manager | 2 | Placeholder dashboard (+ shared workshops if instructor) |
| Trainer | 2 | Placeholder dashboard (+ shared workshops if instructor) |
| Admin | 2 | Placeholder dashboard (+ shared workshops if instructor) |
| Auth | login / signup / callback | Real |
| Public | home, about, careers, life, projects, gallery, register, `/f/[token]`, maintenance | Mixed — see §2.2 |
| Maintenance | 1 | Real (middleware + settings) |

---

## 2. What is working vs not

### 2.1 Manager domain

| Domain | Status |
|--------|--------|
| Auth / login / signup / logout | **Working** |
| Users list + create / edit | **Working** |
| User detail `/manager/users/[id]` | **Not working (mock)** — ignores `userId`; always shows preview user |
| Students list / create / update / core detail | **Working** |
| Student joined classes + grades/attendance/tasks on detail | **Working** |
| Student borrowed-equipment **section** on detail | **Not working (mock)** |
| Equipment list / detail / borrow page | **Working** |
| Subjects list / detail / classes | **Working** |
| Classes / sessions / tasks / attendance / final exam / grades | **Working** |
| Semesters / enrollments / progress | **Working** |
| Instructors + subject capabilities | **Working** |
| Instructor schedules + overlap + workshop mirror | **Working** |
| Schedule assistant (Cloudflare Workers AI) | **Working** (pipeline covered by tests; UI still wants a manual glance) |
| Cloudflare AI usage log | **Working** |
| Workshops CRUD + status / instructors / documents / sessions / payments | **Working** |
| Accounting (phases → SPPs → payments → adjustments / forms) | **Working** |
| Public financial form `/f/[token]` | **Working** |
| Income statement + income analytics | **Working** |
| Weekly schedule / calendar | **Working** |
| Notifications (manager CRUD) | **Working** (in-app records only; other-role inboxes are shells — nav still marked ❗) |
| Relationships | **Working** |
| Audit logs | **Working** |
| Emailing + sent + resend | **Working** (known caveats: mid-loop send, resend stores plain body) |
| Gallery (manager + public page) | **Working** |
| Projects (manager list / detail / CRUD) | **Working** |
| Public `/projects` page | **Not wired** — still hardcoded `lib/constants/public-projects.ts` |
| Registrations inbox + status | **Working** |
| Public `/register` wizard | **Working** |
| Settings / maintenance / credentials | **Working** |
| Cron jobs (settings section; standalone page still exists) | **Working** |
| Backup export | **Working**, but table list is **stale** (see §6.3) |
| RBAC / Permissions UI | **Working** |
| Dashboard aggregations | **Working** |
| Analytics `/manager/analytics` | **Not working (stub)** — “will be rebuilt here” |
| Reports `/manager/reports` | **Not working (mock)** — full UI on fake rows |

### 2.2 Public site

| Page | Status |
|------|--------|
| Home | **Static** (copy/images in components + constants) |
| About | **Mostly static**; featured images pulled from **real gallery** |
| Careers / roadmaps | **Static** constants |
| Life / blog detail | **Static** constants |
| Projects | **Static** constants — **not** reading `public_projects` |
| Gallery | **Working** (Supabase `gallery_images`) |
| Register | **Working** |
| Financial form invite | **Working** |
| Auth + maintenance | **Working** |

### 2.3 Other roles

| Surface | Status |
|---------|--------|
| Student **Activity** | **Working** (`listStudentActivityForSelf`) |
| Student dashboard / classes / finance / analytics / notifications | **Placeholder** |
| Teacher dashboard / schedule / classes / subjects / students / notifications / analytics | **Placeholder** |
| Admin / co-manager / trainer dashboards | **Placeholder** |
| Shared **Manage workshops** (any role with `is_instructor` + `workshops.view`) | **Working** |
| CEO instructors / schedules / workshops / AI usage / income analytics | **Working** via shared `/manager/*` routes |

### 2.4 Legacy mock debt still on disk

| Category | Count | Location |
|----------|------:|----------|
| `manager-*-mock.ts` constants | 12 | `lib/constants/` |
| `get-*-preview.ts` helpers | 3 | `lib/manager/` |
| sessionStorage preview stores | 0 | removed |

**Still live (do not delete yet):**

- `manager-users-mock.ts` + `get-manager-user-preview.ts` → user detail
- `manager-student-borrow-equipment-mock.ts` + `get-manager-student-borrow-equipment-preview.ts` → student detail borrow section
- Reports mock chain: `manager-reports-mock.ts`, `manager-classes-mock.ts`, `manager-phases-mock.ts`, `manager-relationships-mock.ts`, `manager-subjects-mock.ts`, `manager-students-mock.ts`, `manager-student-classes-mock.ts`, `manager-student-class-detail-mock.ts`, `get-manager-student-class-detail-preview.ts`

**Dead (no importers):** `manager-notifications-mock.ts`, `manager-student-semester-mock.ts`

---

## 3. Database & migrations

### 3.1 Schema snapshot (47 public tables)

Core people / academics: `profiles`, `student_profiles`, `relationships`, `subjects`, `classes`, `class_teacher`, `student_class`, `semesters`, `student_semester`, `sessions`, `attendee`, `tasks`, `student_tasks`, `final_exam`, `student_finalexam_grade`, `student_course_grade`

Ops: `equipments`, `borrow_equipment`, `student_takeouts`, `weekly_schedule_slots`, `notifications`, `audit_logs`, `backup_history`, `app_settings`

RBAC: `permissions`, `role_permissions`

Finance (post-rewrite): `payment_phases`, `student_payment_phases`, `student_payments`, `student_financial_adjustments`, `student_financial_forms`, `student_financial_form_invites`, `transactions`

Workshops / instructors: `workshops`, `workshop_instructors`, `workshop_documents`, `workshop_payments`, `workshop_sessions`, `instructor_schedule_slots`, `instructor_subject_capability`

Comms / public / AI: `email_sent`, `email_users`, `gallery_images`, `public_projects`, `student_registration_applications`, `student_registration_documents`, `cloudflare_ai_usage`

Dropped since July 12: old account / scheduled-payment / special-case tables (`20260728120000_drop_accounting_tables.sql`).

### 3.2 Migration themes (50 files)

| Period | Theme |
|--------|--------|
| June–mid July | Initial schema, grade JSON, semester status, crons |
| Late July | Accounting drop + payment phases; email tables; RBAC |
| Early August | Transactions; binary `student_class`; weekly calendar; instructors/capabilities; workshops + storage; instructor schedules; AI usage |
| Mid August | Gallery; registration applications + documents storage; financial-form invites; `public_projects` + projects storage |

### 3.3 Schema leftovers

- **`student_takeouts`** — table + backup label only; still **no repository, service, or UI**.
- **Backup export list** (`BACKUP_TABLES`) has **31** names and omits most tables added after July (accounting, email, RBAC, gallery, projects, registrations, transactions, capabilities). A “full backup” is **not** a full backup.
- Group / attendance JSON columns on `student_course_grade` are still unused by official compute (2-factor tasks + exam). Intentional per grades audit.

---

## 4. Build & test health

### 4.1 TypeScript — **green**

`npm run typecheck` (`tsc --noEmit`) exits **0**. July 12 backup / status-enum / `InlineSpinner` / validator / export errors are gone.

### 4.2 ESLint — **green**

`npm run lint` exits **0** with no reported errors or warnings.

### 4.3 Tests

| Metric | Value |
|--------|------:|
| Test files passed | 101 / 101 |
| Tests passed | 789 |
| Failed suites | 0 |

July 12 `borrow-equipment.service.test.ts` `server-only` failure is **fixed**. New coverage includes workshops, accounting, RBAC, registrations, schedule assistant, public-project service/validators, loaders.

---

## 5. Auth, RBAC & security

### 5.1 Middleware (working)

- Session via Supabase middleware client; role via claims first, then `resolveUserRole`.
- Panel roots require login; wrong role → own dashboard (except **shared manager paths** for workshops / instructor schedules / etc.).
- Guest-only auth routes redirect logged-in users.
- Maintenance mode still blocks teacher/student as designed.
- Nav timing headers exist for performance debugging.

### 5.2 RBAC (working — shipped July 29, catalog now 139 keys)

Three enforcement layers in use today:

1. **Middleware / path access** — role panel roots + shared-route allowlist  
2. **Route view map** — `/manager/*` requires the matching `*.view` / `rbac.manage`  
3. **Service `assertPermission`** — every mutation/read on the admin client  

UI: server-filtered nav + `Can` on write controls. Manager Permissions page can edit `role_permissions`. Dynamic permission-mirrored RLS was **explicitly not** chosen.

### 5.3 Table RLS

Enabled **with policies** (unchanged since July 9):

| Table | Policies |
|-------|----------|
| `profiles` | select/update own |
| `student_profiles` | select/update own |
| `app_settings` | public select |

Enabled **without table policies** (deny-all except service role):

| Table | Notes |
|-------|--------|
| `gallery_images` | Public gallery uses admin client |
| `public_projects` | Manager CRUD uses admin client; public page does not query DB yet |
| `student_registration_applications` | Public register uses admin client via service |
| `student_registration_documents` | Storage policies exist; table is admin-client |

**Storage policies exist** for `workshops`, `projects`, and registration-document buckets.

**~40 domain tables have no RLS.** That matches the documented admin-client + RBAC model. It is still unsafe if a repository is ever called with the user session client, or if types/anon keys are used from the browser.

### 5.4 Layering exceptions

- Settings page still reads `app-settings.repository` directly (bypasses services) — same exception as July 12.
- Admin client remains `server-only`.
- Public gallery / about / register pages correctly go **page → service → repository**, not components → Supabase.

---

## 6. Known gaps & risks

### 6.1 High priority

1. **Finish public projects** — manager CRUD is live; `/projects` still renders hardcoded cards. Visitors will not see manager-created rows.
2. **Replace remaining manager mocks** — reports, analytics stub, user detail, student-detail borrow section.
3. **Expand `BACKUP_TABLES`** — current list misses accounting, email, RBAC, gallery, projects, registrations, transactions, capabilities (~16 tables).
4. **Keep the admin-client contract** — no client/repository imports; no session-client domain queries.

### 6.2 Manager polish

| Item | Gap |
|------|-----|
| `/manager/reports` | Full UI on mock constants (nav marked ❗) |
| `/manager/analytics` | Empty placeholder (nav marked ❗) |
| `/manager/users/[id]` | Preview data, not `user.service` |
| Student detail borrow section | Preview rows; dedicated `/manager/equipments/borrow` is real |
| Notifications product | Manager CRUD works; teacher/student inboxes are shells (nav marked ❗) |
| Emailing | Partial mid-batch send; resend is plain-text body |
| Accounting T6.3 | Print/export still deferred |
| Page skeletons | All manager routes `[~]` shared template; none `[x]` progressive Suspense |
| Dead mocks | Notifications + student-semester mock files unused |

### 6.3 Schema / product leftovers

| Item | Gap |
|------|-----|
| `student_takeouts` | Table only |
| Backup table list | Stale vs 47-table schema |
| Public careers / life / home | Static marketing; no CMS |
| `student_course_grade` JSON grade columns | Unused by compute (intentional 2-factor model) |

### 6.4 Other roles

Teacher, student (except Activity), admin, co-manager, and trainer are route shells. Workshop access for `is_instructor` is the only real cross-role product surface besides CEO’s shared manager routes.

### 6.5 Performance (open, not broken)

Nav slowness and top-loader sync were investigated in `docs/[07] Reports/Slowliness/`. Caching and loader work landed in early August; operators can still feel panel switches as slow. This is polish, not a functional outage.

---

## 7. Recommended next order

### Phase A — Close in-flight public/manager gaps

1. Point public `/projects` at `public_projects` (bilingual fields already on the table).
2. Confirm manager project create/edit uploads to the `projects` bucket and that public cards use those URLs.
3. Wire user detail to `user.service`.
4. Replace student-detail borrow section with `borrow-equipment.service` (same data as the borrow page).

### Phase B — Reports / analytics

1. Rebuild `/manager/reports` on live repositories (drop the mock chain).
2. Either rebuild `/manager/analytics` or hide the nav item until it has data.
3. Delete dead `manager-*-mock.ts` files after the above.

### Phase C — Ops completeness

1. Add missing tables to `BACKUP_TABLES`.
2. Decide whether `student_takeouts` is in-scope or drop/document it.
3. Emailing reliability (queue / pending status) if circulars go to large lists.

### Phase D — Other roles

1. Teacher: schedule, classes, attendance/grades entry (reuse class/session services).
2. Student: classes, finance (reuse SPP/payment reads), notifications inbox.
3. Admin / co-manager / trainer dashboards or keep them as workshop-only shells on purpose.

---

## 8. Quick reference

| Path | Role (August 15) |
|------|------------------|
| `services/` | 44 production services |
| `repositories/` | 48 data-access modules |
| `app/**/actions.ts` | 27 action modules |
| `app/api/` | backup + navbar-state + schedule assistant |
| `supabase/migrations/` | 50 files |
| `types/supabase.ts` | 47 public tables |
| `lib/constants/permissions.ts` | 139 keys |
| `lib/constants/manager-*-mock.ts` | 12 leftover mocks |
| `lib/manager/get-*-preview.ts` | 3 preview helpers |
| `docs/[07] Reports/[02]…` | Prior status scan (outdated counts / red build) |

---

## 9. Conclusion

Etkan MS is **past the July 12 “not deploy-ready because typecheck/lint are red” stage.** The manager operational core — people, academics, grades, equipment, accounting, workshops, instructors, schedule, email, gallery, registrations, RBAC, dashboard, income statement — is **on Supabase and covered by a green test/typecheck/lint suite.**

It is **not feature-complete as a multi-role school OS:** reports and analytics are still fake or empty, a few manager detail surfaces still use preview data, public projects are not reading the new table, backup export is incomplete, and teacher/student panels (aside from student activity and shared workshops) are shells.

**Nearest milestone:** public projects live + remaining manager mocks gone + backup list complete.  
**Next product milestone:** teacher and student panels on the same service layer.
