# RBAC — Permission Definitions (frozen)

**Status:** Phase 0 complete — list frozen for coding (Phase 1).  
**Baseline:** manager panel capabilities.  
**Roles co-manager / trainer:** empty panels — no keys yet.

---

## Naming rules

| Rule | Example |
|------|---------|
| Format | `{feature}.{action}` |
| Feature | lowercase plural noun (`students`, `final_exams`) |
| Action | lowercase verb (`view`, `create`, `update`, `delete`) |
| Multi-word action | snake_case (`mark_read`, `borrow_return`) |
| One key | Exactly one key per grantable action — no duplicates |

**Access**

- **read** — see data / open pages / preview  
- **write** — create, change, delete, compute, export, send, toggle  

Search, filter, and list↔detail are part of the matching `*.view` key (not separate keys).

**Accounting:** view-only until real accounting features exist (`accounting.view` only).

---

## Feature groups (final)

Kept as separate groups (match manager domains):

Dashboard · Users · Students · Relationships · Subjects · Classes · Sessions · Attendance · Tasks · Final Exams · Grades · Semesters · Equipment · Schedule · Notifications · Emailing · Accounting · Reports · Analytics · Backup · Logs · Cron Jobs · Settings

Collapsed into `*.view` (not separate permissions): search, filter, schedule/alerts widgets on dashboard, student detail sub-tabs (classes/grades/borrows summaries).

---

## Catalog

Format: `key` — label — access

### Dashboard

| Key | Label | Access |
|-----|-------|--------|
| `dashboard.view` | View dashboard | read |

### Users

| Key | Label | Access |
|-----|-------|--------|
| `users.view` | View users | read |
| `users.create` | Create staff user | write |
| `users.update` | Edit user | write |

### Students

| Key | Label | Access |
|-----|-------|--------|
| `students.view` | View students | read |
| `students.create` | Create student | write |
| `students.update` | Edit student | write |
| `students.change_status` | Change student status | write |

### Relationships

| Key | Label | Access |
|-----|-------|--------|
| `relationships.view` | View relationships | read |
| `relationships.create` | Create relationship | write |
| `relationships.update` | Edit relationship | write |

### Subjects

| Key | Label | Access |
|-----|-------|--------|
| `subjects.view` | View subjects | read |
| `subjects.create` | Create subject | write |
| `subjects.update` | Edit subject | write |
| `subjects.delete` | Delete subject | write |

### Classes

| Key | Label | Access |
|-----|-------|--------|
| `classes.view` | View classes | read |
| `classes.create` | Create class | write |
| `classes.update` | Edit class | write |
| `classes.change_status` | Change class status | write |
| `classes.assign_teacher` | Assign teacher | write |
| `classes.unassign_teacher` | Unassign teacher | write |
| `classes.add_student` | Add student to class | write |
| `classes.change_enrollment` | Change student enrollment status | write |
| `classes.view_analytics` | View class analytics | read |

### Sessions

| Key | Label | Access |
|-----|-------|--------|
| `sessions.view` | View sessions | read |
| `sessions.create` | Create session | write |
| `sessions.update` | Edit session | write |
| `sessions.delete` | Delete session | write |
| `sessions.update_settings` | Update session settings | write |

### Attendance

| Key | Label | Access |
|-----|-------|--------|
| `attendance.view` | View attendance | read |
| `attendance.update` | Update attendance | write |

### Tasks

| Key | Label | Access |
|-----|-------|--------|
| `tasks.view` | View tasks | read |
| `tasks.create` | Create task | write |
| `tasks.update_student` | Edit student task | write |

### Final Exams

| Key | Label | Access |
|-----|-------|--------|
| `final_exams.view` | View final exam | read |
| `final_exams.create` | Create final exam | write |
| `final_exams.update` | Edit final exam | write |
| `final_exams.update_student` | Edit student final-exam grade | write |

### Grades

| Key | Label | Access |
|-----|-------|--------|
| `grades.view` | View class grades | read |
| `grades.compute` | Compute student grade | write |
| `grades.compute_all` | Compute all class grades | write |
| `grades.compute_custom` | Compute grade with custom weights | write |
| `grades.delete` | Delete computed grade | write |
| `grades.export_certificates` | Export grade certificates | write |
| `grades.export_fast_certificate` | Export fast certificate | write |
| `grades.preview_certificate` | Preview grade certificate | read |

### Semesters

| Key | Label | Access |
|-----|-------|--------|
| `semesters.view` | View semesters | read |
| `semesters.create` | Create semester | write |
| `semesters.update` | Edit semester | write |
| `semesters.add_student` | Add student to semester | write |
| `semesters.connect_class` | Connect class to semester | write |

### Equipment

| Key | Label | Access |
|-----|-------|--------|
| `equipment.view` | View equipment | read |
| `equipment.create` | Create equipment | write |
| `equipment.update` | Edit equipment | write |
| `equipment.view_borrows` | View borrow history | read |
| `equipment.borrow_create` | Create borrow | write |
| `equipment.borrow_update` | Edit borrow | write |
| `equipment.borrow_return` | Mark borrow returned / not returned | write |

### Schedule

| Key | Label | Access |
|-----|-------|--------|
| `schedule.view` | View schedule | read |
| `schedule.create` | Create schedule slot | write |
| `schedule.update` | Edit schedule slot | write |
| `schedule.delete` | Delete schedule slot | write |

### Notifications

| Key | Label | Access |
|-----|-------|--------|
| `notifications.view` | View notifications | read |
| `notifications.create` | Create notification | write |
| `notifications.update` | Edit notification | write |
| `notifications.mark_read` | Mark notification(s) read | write |
| `notifications.delete` | Delete notification | write |

### Emailing

| Key | Label | Access |
|-----|-------|--------|
| `emailing.view` | View emailing and sent mail | read |
| `emailing.send` | Compose and send email | write |
| `emailing.resend` | Resend email | write |

### Accounting

| Key | Label | Access |
|-----|-------|--------|
| `accounting.view` | View accounting page | read |

### Reports

| Key | Label | Access |
|-----|-------|--------|
| `reports.view` | View reports | read |
| `reports.export` | Export report CSV | write |
| `reports.print` | Print report | write |

### Analytics

| Key | Label | Access |
|-----|-------|--------|
| `analytics.view` | View analytics | read |

### Backup

| Key | Label | Access |
|-----|-------|--------|
| `backup.view` | View backup history | read |
| `backup.export_table` | Export table backup | write |
| `backup.export_full` | Export full backup | write |
| `backup.download` | Download backup file | write |

### Logs

| Key | Label | Access |
|-----|-------|--------|
| `logs.view` | View audit logs | read |

### Cron Jobs

| Key | Label | Access |
|-----|-------|--------|
| `cron_jobs.view` | View cron jobs | read |

### Settings

| Key | Label | Access |
|-----|-------|--------|
| `settings.view` | View settings | read |
| `settings.maintenance` | Toggle maintenance mode | write |
| `settings.update_credentials` | Update own email or password | write |

---

## Key index (unique)

```
dashboard.view
users.view
users.create
users.update
students.view
students.create
students.update
students.change_status
relationships.view
relationships.create
relationships.update
subjects.view
subjects.create
subjects.update
subjects.delete
classes.view
classes.create
classes.update
classes.change_status
classes.assign_teacher
classes.unassign_teacher
classes.add_student
classes.change_enrollment
classes.view_analytics
sessions.view
sessions.create
sessions.update
sessions.delete
sessions.update_settings
attendance.view
attendance.update
tasks.view
tasks.create
tasks.update_student
final_exams.view
final_exams.create
final_exams.update
final_exams.update_student
grades.view
grades.compute
grades.compute_all
grades.compute_custom
grades.delete
grades.export_certificates
grades.export_fast_certificate
grades.preview_certificate
semesters.view
semesters.create
semesters.update
semesters.add_student
semesters.connect_class
equipment.view
equipment.create
equipment.update
equipment.view_borrows
equipment.borrow_create
equipment.borrow_update
equipment.borrow_return
schedule.view
schedule.create
schedule.update
schedule.delete
notifications.view
notifications.create
notifications.update
notifications.mark_read
notifications.delete
emailing.view
emailing.send
emailing.resend
accounting.view
reports.view
reports.export
reports.print
analytics.view
backup.view
backup.export_table
backup.export_full
backup.download
logs.view
cron_jobs.view
settings.view
settings.maintenance
settings.update_credentials
```

**Count:** 84 keys · all unique · naming consistent · accounting view-only.

---

## Change rule

New feature or action → add a row here first (see `.cursor/rules/rbac.mdc`), then implement in code (Phase 1+).
