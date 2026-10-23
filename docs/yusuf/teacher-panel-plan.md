# Teacher panel (complete)

Phased plan to implement the teacher academic panel on the **existing schema** (no migrations). This is the full scope to finish now—not a temporary slice.

## Decisions (locked)

- **No schema changes** — use `profiles`, `class_teacher`, `classes`, `subjects`, `student_class`, `sessions`, `tasks`, `student_tasks`, existing analytics queries.
- **Assignment** — manager assigns via existing UI → `class_teacher`. Teacher must have `is_instructor` to be assignable; `role = teacher` for `/teacher`.
- **Classes** — view assigned classes only; **no** edit class details, enroll, or assign/unassign.
- **Students** — view roster of assigned classes only.
- **Syllabus** — edit subject link fields (`syllabus_link`, `reference_link`, `handout_link`) for subjects of assigned classes. Shared subject: update affects all classes on that subject (existing model).
- **Tasks** — full task ops on sessions of assigned classes: create, update, delete, update student task (`tasks.view|create|update|update_student|delete`). No attendance write, no final-exam/grade-compute flows unless already required as read inputs for analytics.
- **Analytics** — reuse manager class analytics, scoped to assigned classes.
- **Profile** — change own username (profile) + email/password (credentials).
- **Account prep** — documented checklist using current manager tools (not a new admin product).

## How teachers get classes (existing)

1. Manager opens class detail → Assign teachers.
2. Service `assignTeacherToClassForManager` inserts `class_teacher` (requires `is_instructor`).
3. Subject comes from `classes.subject_id`, not a separate teacher–subject table.

## RBAC seed (replace current full class-tree seed)

Today `TEACHER_SEED_PERMISSIONS` in `lib/constants/role-seed-permissions.ts` = all keys under classes/sessions/attendance/tasks/final_exams/grades. Replace with an **explicit allowlist**:

- `classes.view`, `classes.view_analytics`
- `sessions.view` (navigate to tasks; no session CRUD UI)
- `attendance.view`, `grades.view` (read for analytics charts only)
- `tasks.view`, `tasks.create`, `tasks.update`, `tasks.update_student`, `tasks.delete`
- `subjects.view`, `subjects.update` (service restricts to link fields + taught subjects)
- `settings.view`, `settings.update_credentials`

**Out of seed:** class create/update/delete, assign/unassign teacher, add/remove student, session create/update/delete, attendance mark, final exams writes, grades compute/export, subjects create/delete/categories/exercises.

Also update:

- `docs/[06] RBAC/[02] permission-definitions.md`
- role-seed docs

Row scope = `class_teacher` (subject access via taught classes). Existing teacher users need a **permission re-sync** after the seed change (see Phase 6).

## Architecture

```text
/teacher pages
  → services …ForTeacher
    → class_teacher scope check
      → existing repositories
```

- Mirror student `…ForSelf` pattern: new teacher-scoped services; reuse repos; assert assignment before every class/subject/task mutation.
- Do not wire manager edit-class dialogs into teacher routes.
- Reuse manager task dialogs / analytics sections where practical, behind teacher actions + scope checks.

## Routes and nav

Fill `TEACHER_PANEL_NAVIGATION` in `lib/constants/panel-nav.ts` and `ROUTES` in `lib/constants/routes.ts`:

| Path | Role |
|------|------|
| `/teacher` | Redirect to classes or compact home |
| `/teacher/profile` | Profile + credentials |
| `/teacher/classes` | My classes |
| `/teacher/classes/[id]` | Read-only detail, students, link to sessions/tasks + analytics |
| `/teacher/classes/[id]/sessions/[sessionId]` | Session + tasks (edit) |
| `/teacher/classes/[id]/sessions/[sessionId]/tasks/[taskId]` | Task detail / student tasks |
| `/teacher/subjects` | Subjects I teach + edit links |
| `/teacher/analytics` | List/overview of analytics for my classes (or deep-link from class) |

Optional: keep shared Manage workshops nav when instructor/mentor.

## Phases

### Phase 0 — Plan doc + RBAC + constants

- This file (`docs/yusuf/teacher-panel-plan.md`); link from `docs/yusuf/README.md`.
- Narrow `TEACHER_SEED_PERMISSIONS`; update RBAC docs + tests in `role-seed-permissions.test.ts`.
- Add route constants and teacher nav items.

### Phase 1 — Scope helpers + read services — DONE

- Repo: `listClassTeachersByTeacherId`, `listClassDetailsByIds`, `listSubjectsByIds`.
- Auth: `assertTeacherSelfAccess` (`classes.view` or role `teacher`).
- Services (`services/classes/teacher-class-self.service.ts`): `assertTeacherAssignedToClass`, `listMyClassesForTeacher`, `getMyClassDetailForTeacher`, `listMyClassStudentsForTeacher`, `listMyClassSessionsForTeacher`, `listMySubjectsForTeacher`.
- Hard-fail (`Unauthorized.`) if class not assigned.
- Types: `types/teacher-class.ts`. Tests: `teacher-class-self.service.test.ts`.

### Phase 2 — Classes + students UI — DONE

- Routes: `/teacher` → redirect to `/teacher/classes`; `/teacher/classes`; `/teacher/classes/[id]`.
- Nav: My classes. Home landing: `TEACHER_CLASSES`.
- UI: `TeacherClassesPanel`, `TeacherClassDetailsPanel` — read-only class summary, sessions browser, students table (no class edit / enroll).
- Pages call Phase 1 services; unassigned class → `notFound()`.

### Phase 3 — Syllabus + tasks (mutations) — DONE

- Seed: teacher gets `subjects.view` + `subjects.update` in addition to class tree.
- Subjects: `/teacher/subjects` + `updateSubjectLinksForTeacher` (links only; name/nb_sessions preserved).
- Tasks: `/teacher/classes/[id]/sessions/[sessionId]` (+ task detail); `…ForTeacher` wrappers assert `class_teacher` then reuse manager task services.
- Shared dialogs accept optional `action` props; teacher actions revalidate teacher routes.
- Class detail links into session/tasks. No class-row updates.

### Phase 4 — Analytics

- Teacher wrappers around `getClassAnalyticsForManager` / existing analytics UI, permission `classes.view_analytics`, assigned classes only.
- Class detail section and/or `/teacher/analytics`.

### Phase 5 — Profile

- `/teacher/profile`: show self; update username; email/password via pattern from manager `SelfCredentialsSection` / `updateSelfCredentials` (grant settings permissions on teacher).
- Toasts on success/error.

### Phase 6 — Account prep + verify

Checklist (ops, no schema change):

1. Create user (manager users flow).
2. Set `role = teacher`.
3. Set `is_instructor = true` (required to assign to a class).
4. Assign teacher on each class (manager class detail → Assign teachers → `class_teacher`).
5. Re-sync/re-seed teacher role permissions after seed change.
6. Teacher logs in → `/teacher` → verify classes, subjects/syllabus edit, tasks, analytics, profile.

Manual smoke path through all routes; no schema migrations in the implementation PR.

## Out of scope (explicit)

- Schema/migrations
- Attendance marking, final exams, certificate/grade compute
- Teacher self-assign to classes
- Reworking manager assign UI (already works)
- Schedule / notifications pages (not requested)

## Primary files to touch

- `app/(panels)/teacher/` — pages
- `lib/constants/panel-nav.ts`, `routes.ts`, `role-seed-permissions.ts`
- New `services/…` teacher-scoped modules; light `repositories/class-teacher.repository.ts` helpers
- Reuse `services/classes/session-tasks.service.ts`, subject update, `class-queries.service.ts` analytics
- RBAC docs under `docs/[06] RBAC/`
- This plan: `docs/yusuf/teacher-panel-plan.md`
