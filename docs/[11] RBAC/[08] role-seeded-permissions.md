# RBAC — Role seeded permissions

Default grants applied by `npm run seed:rbac` from `lib/constants/role-seed-permissions.ts`.

Shared workshop access package (`WORKSHOP_ACCESS_SEED_PERMISSIONS`) is included for **every** role:

- `workshops.view`
- `workshops.sessions.create` / `update` / `delete`
- `workshops.documents.create` / `update` / `delete`
- `instructors.view` (covers reading instructor capabilities)
- `instructor_schedules.view`

Shared instructor portal package (`INSTRUCTOR_PORTAL_SEED_PERMISSIONS`) is included for **every** role (feature entry still requires `profiles.is_instructor = true`):

- `instructor_portal.view`
- `instructor_portal.schedule.view`
- `instructor_portal.workshops.view`
- `instructor_portal.workshops.update`
- `instructor_portal.workshops.sessions.create` / `update` / `delete`
- `instructor_portal.workshops.documents.create` / `update` / `delete`
- `instructor_portal.capabilities.view`

---

## Manager

Full catalog (`PERMISSION_KEYS`) — every permission, including all workshop module writes and instructor feature keys:

### Workshops
- `workshops.view`
- `workshops.create`
- `workshops.update`
- `workshops.delete`
- `workshops.change_status`
- `workshops.instructors.create`
- `workshops.instructors.update`
- `workshops.instructors.delete`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`
- `workshops.payments.create`
- `workshops.payments.update`
- `workshops.payments.delete`

Plus all other features (dashboard, users, students, subjects, classes, sessions, attendance, tasks, final exams, grades, semesters, equipment, schedule, instructor schedules, workshops, instructor portal, notifications, emailing, accounting, reports, analytics, backup, logs, cloudflare AI usage, cron jobs, settings, rbac).

---

## Admin

### Accounting
- `accounting.income_statement.view`

### Backup
- `backup.view`
- `backup.export_table`
- `backup.export_full`
- `backup.download`

### Instructors
- `instructors.view`

### Instructor Schedules
- `instructor_schedules.view`

### Workshops
- `workshops.view`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`

---

## CEO

### Dashboard
- `dashboard.view`

### Users
- `users.view`

### Students
- `students.view`

### Subjects
- `subjects.view`
- `subjects.create`
- `subjects.update`

### Instructors
- `instructors.view`
- `instructors.capabilities.update`

### Classes
- `classes.view`
- `classes.view_analytics`

### Sessions
- `sessions.view`

### Attendance
- `attendance.view`

### Tasks
- `tasks.view`

### Final Exams
- `final_exams.view`

### Grades
- `grades.view`

### Semesters
- `semesters.view`

### Schedule
- `schedule.view`

### Instructor Schedules
- `instructor_schedules.view`
- `instructor_schedules.create`
- `instructor_schedules.update`
- `instructor_schedules.delete`

### Workshops
- `workshops.view`
- `workshops.create`
- `workshops.update`
- `workshops.delete`
- `workshops.change_status`
- `workshops.instructors.create`
- `workshops.instructors.update`
- `workshops.instructors.delete`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`
- `workshops.payments.create`
- `workshops.payments.update`
- `workshops.payments.delete`

### Accounting
- `accounting.view`
- `accounting.income_statement.view`

### Analytics
- `analytics.view`

### Cloudflare AI usage
- `cloudflare_ai_usage.view`

---

## Co-manager

### Instructors
- `instructors.view`

### Instructor Schedules
- `instructor_schedules.view`

### Workshops
- `workshops.view`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`

---

## Teacher

### Instructors
- `instructors.view`

### Instructor Schedules
- `instructor_schedules.view`

### Workshops
- `workshops.view`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`

---

## Trainer

### Instructors
- `instructors.view`

### Instructor Schedules
- `instructor_schedules.view`

### Workshops
- `workshops.view`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`

---

## Student

### Instructors
- `instructors.view`

### Instructor Schedules
- `instructor_schedules.view`

### Workshops
- `workshops.view`
- `workshops.documents.create`
- `workshops.documents.update`
- `workshops.documents.delete`
- `workshops.sessions.create`
- `workshops.sessions.update`
- `workshops.sessions.delete`
