# RBAC — Role seeded permissions

Default grants applied by `npm run seed:rbac` from `lib/constants/role-seed-permissions.ts`.

Roles with no bullets receive an empty grant set (no `role_permissions` rows).

---

## Manager

### Dashboard
- `dashboard.view`

### Users
- `users.view`
- `users.create`
- `users.update`

### Students
- `students.view`
- `students.create`
- `students.update`
- `students.change_status`

### Relationships
- `relationships.view`
- `relationships.create`
- `relationships.update`

### Subjects
- `subjects.view`
- `subjects.create`
- `subjects.update`
- `subjects.delete`

### Instructors
- `instructors.view`
- `instructors.capabilities.update`

### Classes
- `classes.view`
- `classes.create`
- `classes.update`
- `classes.change_status`
- `classes.assign_teacher`
- `classes.unassign_teacher`
- `classes.add_student`
- `classes.remove_student`
- `classes.view_analytics`

### Sessions
- `sessions.view`
- `sessions.create`
- `sessions.update`
- `sessions.delete`
- `sessions.update_settings`

### Attendance
- `attendance.view`
- `attendance.update`

### Tasks
- `tasks.view`
- `tasks.create`
- `tasks.update_student`

### Final Exams
- `final_exams.view`
- `final_exams.create`
- `final_exams.update`
- `final_exams.update_student`

### Grades
- `grades.view`
- `grades.compute`
- `grades.compute_all`
- `grades.compute_custom`
- `grades.delete`
- `grades.export_certificates`
- `grades.export_fast_certificate`
- `grades.preview_certificate`

### Semesters
- `semesters.view`
- `semesters.create`
- `semesters.update`
- `semesters.add_student`
- `semesters.connect_class`

### Equipment
- `equipment.view`
- `equipment.create`
- `equipment.update`
- `equipment.view_borrows`
- `equipment.borrow_create`
- `equipment.borrow_update`
- `equipment.borrow_return`

### Schedule
- `schedule.view`
- `schedule.create`
- `schedule.update`
- `schedule.delete`

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

### Notifications
- `notifications.view`
- `notifications.create`
- `notifications.update`
- `notifications.mark_read`
- `notifications.delete`

### Emailing
- `emailing.view`
- `emailing.send`
- `emailing.resend`

### Accounting
- `accounting.view`
- `accounting.income_statement.view`
- `accounting.transactions.create`
- `accounting.transactions.update`
- `accounting.transactions.delete`
- `accounting.payment_phases.create`
- `accounting.payment_phases.update`
- `accounting.payment_phases.cancel`
- `accounting.spp.transfer`
- `accounting.spp.delete`
- `accounting.payments.create`
- `accounting.payments.update`
- `accounting.payments.delete`
- `accounting.adjustments.create`
- `accounting.adjustments.update`
- `accounting.adjustments.delete`

### Reports
- `reports.view`
- `reports.export`
- `reports.print`

### Analytics
- `analytics.view`

### Backup
- `backup.view`
- `backup.export_table`
- `backup.export_full`
- `backup.download`

### Logs
- `logs.view`

### Cloudflare AI usage
- `cloudflare_ai_usage.view`

### Cron Jobs
- `cron_jobs.view`

### Settings
- `settings.view`
- `settings.maintenance`
- `settings.update_credentials`

### RBAC
- `rbac.manage`

---

## Admin

### Accounting
- `accounting.income_statement.view`

### Backup
- `backup.view`
- `backup.export_table`
- `backup.export_full`
- `backup.download`

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

### Accounting
- `accounting.view`
- `accounting.income_statement.view`

### Analytics
- `analytics.view`

### Cloudflare AI usage
- `cloudflare_ai_usage.view`

---

## Co-manager

_(none)_

---

## Teacher

_(none)_

---

## Trainer

_(none)_

---

## Student

_(none)_
