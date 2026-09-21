# RBAC — Role seeded permissions

Default grants applied by `npm run seed:rbac` from `lib/constants/role-seed-permissions.ts`.

Seed **replaces** each role’s grants (clears previous, then writes the package below).

---

## Manager

Full catalog (`PERMISSION_KEYS`) — every permission.

---

## CEO

Unchanged package (`CEO_WORKSHOP_SEED_PERMISSIONS`): full instructors / mentors / instructor schedules / workshops (incl. payments) plus AI usage, income statement analytics, academic analysis, and the full manage-guests flow:

```
instructors.*
mentors.*
instructor_schedules.*
workshops.* (incl. payments)
cloudflare_ai_usage.view
accounting.income_statement.analytics.view
academic_analysis.view
guests.*
registrations.view
```

Shared pages: `/manager/workshops*`, `/manager/instructor-schedules*`, `/manager/instructors`, `/manager/cloudflare-ai-usage`, `/manager/income-statement/analytics`, `/manager/academic-analysis`, `/manager/guests*`, `/manager/registrations*`.  
Manage instructors, AI usage, guests, academic analysis, and registration dossiers do **not** require `is_instructor`. Workshop/schedule shared UI still does.  
Schedule assistant UI/API and AI usage page require `cloudflare_ai_usage.view`.  
Slot details table (`/manager/instructor-schedules/details`) requires `instructor_schedules.details.view` (manager + CEO seed).  
CEO guest follow-up includes `guests.create_student`. `registrations.view` lets CEO open the dossier from guest details.

---

## Supervisor

Allow-list only (`SUPERVISOR_SEED_PERMISSIONS` / `SUPERVISOR_SEED_FEATURES`):

| Area | Feature groups |
|------|----------------|
| Workshops | all `workshops.*` |
| Subjects | all `subjects.*` (incl. categories + exercises) |
| Students | all `students.*` |
| Classes tree | `classes.*`, `sessions.*`, `attendance.*`, `tasks.*`, `final_exams.*`, `grades.*` |
| Instructor schedules | all `instructor_schedules.*` |
| Academic analysis | `academic_analysis.view` |

Native panel: `/supervisor` (empty dashboard). Day-to-day UI uses `/manager/*` routes with the **full manager nav catalog**, filtered by granted view permissions. Seed above is the **default** package; extra keys granted in the RBAC UI unlock matching sidebar links and routes (no hard-block override). Workshops do **not** require `is_instructor` for supervisors.

---

## CRM

Full manage-guests flow (including teams on that page) plus **full registrations** (`CRM_SEED_PERMISSIONS`):

```
guests.view
guests.create
guests.update
guests.delete
guests.change_status
guests.registration.manage
guests.create_student
teams.view
teams.create
teams.update
teams.delete
teams.assign_guest
registrations.view
registrations.update_status
```

Native panel: `/crm` (redirects to guests). Day-to-day UI uses shared `/manager/guests*` and `/manager/registrations*` only — **not** other `/manager/*` paths.  
`registrations.view` / `registrations.update_status` cover dossier + detail actions. Teams keys power the teams section on Manage guests.

---

## Teacher

Full **class tree** writes/reads (`TEACHER_SEED_PERMISSIONS` = `CLASS_TREE_SEED_PERMISSIONS`):

```
classes.*
sessions.*
attendance.*
tasks.*
final_exams.*
grades.*
```

Same action surface as manager **inside** a class (sessions → tasks, attendance, grades, final exams, …). **Row scope** is assigned classes only (`class_teacher`) — enforced in services, not by fewer keys.  
No workshop seed package (grant workshop keys on the role matrix when an instructor needs Manage workshops).

---

## Co-manager

**Zero** seeded permissions (`[]`). Grants come only from the RBAC UI.

---

## Admin

Shared workshop access package only (`WORKSHOP_ACCESS_SEED_PERMISSIONS`):

```
workshops.view
workshops.sessions.create
workshops.sessions.update
workshops.sessions.delete
workshops.documents.create
workshops.documents.update
workshops.documents.delete
instructors.view
instructor_schedules.view
```

Shared **Manage workshops** UI is available at `/manager/workshops*` when `profiles.is_instructor` is true and the user holds the matching view permission(s).

**List / detail scoping:** Manager, CEO, and supervisor see **all** workshops. Other roles only see workshops where they are assigned in `workshop_instructors`.

---

## Student

Own profile, enrolled class reads, and own SPP / payments (`STUDENT_SEED_PERMISSIONS`):

```
students.view_own
classes.view
sessions.view
attendance.view
tasks.view
grades.view
final_exams.view
accounting.view
payment_schedules.view
```

Login lands on `/student` (details layout read-only vs manager). `accounting.view` / `payment_schedules.view` power **My payments** for the student’s own open-phase SPPs only. Class keys power **My classes** (`/student/classes*` → sessions → tasks) for enrolled classes only (self-scoped services). No workshop seed package.

---

## Ops

Re-run after catalog or seed matrix changes:

```bash
npm run seed:rbac
```
