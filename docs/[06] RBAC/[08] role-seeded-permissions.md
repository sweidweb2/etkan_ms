# RBAC — Role seeded permissions

Default grants applied by `npm run seed:rbac` from `lib/constants/role-seed-permissions.ts`.

Seed **replaces** each role’s grants (clears previous, then writes the package below).

---

## Manager

Full catalog (`PERMISSION_KEYS`) — every permission.

---

## CEO

Full instructors / instructor schedules / workshops module (incl. payments) plus AI usage for Schedule assistant, income statement analytics, and the full manage-guests flow (`CEO_WORKSHOP_SEED_PERMISSIONS`):

```
instructors.view
instructors.create
instructors.delete
instructors.capabilities.update
instructors.subjects.create
instructors.subjects.update
instructors.subjects.delete
mentors.capabilities.update
mentors.subjects.create
mentors.subjects.update
mentors.subjects.delete
instructor_schedules.view
instructor_schedules.details.view
instructor_schedules.create
instructor_schedules.update
instructor_schedules.delete
workshops.view
workshops.create
workshops.update
workshops.delete
workshops.change_status
workshops.instructors.create
workshops.instructors.update
workshops.instructors.delete
workshops.documents.create
workshops.documents.update
workshops.documents.delete
workshops.sessions.create
workshops.sessions.update
workshops.sessions.delete
workshops.payments.view
workshops.payments.create
workshops.payments.update
workshops.payments.delete
cloudflare_ai_usage.view
accounting.income_statement.analytics.view
guests.view
guests.create
guests.update
guests.delete
guests.change_status
guests.registration.manage
guests.create_student
registrations.view
```

Shared pages: `/manager/workshops*`, `/manager/instructor-schedules*`, `/manager/instructors`, `/manager/cloudflare-ai-usage`, `/manager/income-statement/analytics`, `/manager/guests*`, `/manager/registrations*`.  
Manage instructors, AI usage, guests, and registration dossiers do **not** require `is_instructor`. Workshop/schedule shared UI still does.  
Schedule assistant UI/API and AI usage page require `cloudflare_ai_usage.view`.  
Slot details table (`/manager/instructor-schedules/details`) requires `instructor_schedules.details.view` (manager + CEO seed only for now).  
CEO guest follow-up includes `guests.create_student` (create a student from a registration without `students.create`). `registrations.view` lets CEO open the dossier from guest details.  
Re-run `npm run seed:rbac` after deploy so CEO receives the new `guests.*` / `registrations.view` keys.

---

## Supervisor

Manager catalog minus excluded ops / finance / system / users features (`SUPERVISOR_SEED_PERMISSIONS`):

**Excluded feature groups (no grants):**
```
users
accounting
emailing
gallery
projects
notifications
backup
logs
settings
rbac
payment_schedules
cron_jobs
```

**Granted:** every other catalog key (dashboard, students, registrations, guests, teams, subjects, classes, sessions, attendance, tasks, final_exams, grades, semesters, equipment, instructors, mentors, instructor_schedules, workshops including payments, cloudflare_ai_usage).

Native panel: `/supervisor` (empty dashboard). Day-to-day UI uses `/manager/*` routes with the same view-permission gates as manager. Layout **hard-blocks** excluded URL prefixes even if those keys are later granted in the RBAC UI. Workshops do **not** require `is_instructor` for supervisors.

---

## Other roles (admin, co-manager, teacher, trainer)

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

Shared **Manage workshops** UI is available at `/manager/workshops*` when `profiles.is_instructor` is true and the user holds the matching view permission(s). Sidebar requires `is_instructor` + `workshops.view`.

**List / detail scoping:** Manager, CEO, and supervisor see **all** workshops. Other roles only see workshops where they are assigned in `workshop_instructors`.

---

## Student

Workshop access package **plus** own profile, payments, and enrolled-class reads for the student panel:

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
students.view_own
accounting.view
payment_schedules.view
classes.view
sessions.view
attendance.view
grades.view
tasks.view
final_exams.view
```

Login lands on `/student`, which shows the same student-details layout as the manager panel (classes and borrowing) in **read-only** form — activity logs are manager-only. `accounting.view` / `payment_schedules.view` power **My payments** (`/student/payments*`) for the student’s own open-phase SPPs only. `classes.view` / `sessions.view` / `attendance.view` / `grades.view` / `tasks.view` / `final_exams.view` power **My classes** (`/student/classes*`) for enrolled classes only (self-scoped services; no manager class UI). Re-run `npm run seed:rbac` after deploy so existing student roles receive these keys.
