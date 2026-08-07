# RBAC — Permission Definitions (frozen)

**Status:** Phase 0–1 complete — frozen list lives in code at `lib/constants/permissions.ts`.  
**Baseline:** manager panel capabilities.  
**Roles co-manager / trainer:** empty panels — no keys yet.

---

## Naming rules

| Rule | Example |
|------|---------|
| Format | `{feature}.{action}` or `{feature}.{resource}.{action}` |
| Feature | lowercase plural noun (`students`, `final_exams`) |
| Action | lowercase verb (`view`, `create`, `update`, `delete`) |
| Nested resource | optional middle segment (`accounting.payment_phases.create`) |
| Multi-word action | snake_case (`mark_read`, `borrow_return`) |
| One key | Exactly one key per grantable action — no duplicates |

**Access**

- **read** — see data / open pages / preview  
- **write** — create, change, delete, compute, export, send, toggle  

Search, filter, and list↔detail are part of the matching `*.view` key (not separate keys).

**Accounting:** manager billing for class payment phases, student payment phases, payments, and financial adjustments.

---

## Feature groups (final)

Kept as separate groups (match manager domains):

Dashboard · Users · Students · Relationships · Subjects · Classes · Sessions · Attendance · Tasks · Final Exams · Grades · Semesters · Equipment · Schedule · Workshops · Notifications · Emailing · Accounting · Reports · Analytics · Backup · Logs · Cron Jobs · Settings · RBAC

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
| `students.change_status` | Activate / inactivate student (optional class leave + payment-free open SPP delete) | write |

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

### Instructors

| Key | Label | Access |
|-----|-------|--------|
| `instructors.view` | View instructors | read |
| `instructors.create` | Add instructors (`is_instructor` on) | write |
| `instructors.delete` | Remove instructors (`is_instructor` off) | write |
| `instructors.capabilities.update` | Update instructor subject capabilities | write |

### Instructor schedules

| Key | Label | Access |
|-----|-------|--------|
| `instructor_schedules.view` | View instructor schedules | read |
| `instructor_schedules.details.view` | View instructor schedule slot details table | read |
| `instructor_schedules.create` | Create instructor schedule slot | write |
| `instructor_schedules.update` | Edit instructor schedule slot | write |
| `instructor_schedules.delete` | Delete instructor schedule slot | write |

### Workshops

| Key | Label | Access |
|-----|-------|--------|
| `workshops.view` | View workshops | read |
| `workshops.create` | Create workshop | write |
| `workshops.update` | Edit workshop | write |
| `workshops.delete` | Delete workshop | write |
| `workshops.change_status` | Change workshop status | write |
| `workshops.instructors.create` | Add workshop instructor | write |
| `workshops.instructors.update` | Edit workshop instructor | write |
| `workshops.instructors.delete` | Remove workshop instructor | write |
| `workshops.documents.create` | Upload workshop document | write |
| `workshops.documents.update` | Rename workshop document | write |
| `workshops.documents.delete` | Delete workshop document | write |
| `workshops.sessions.create` | Create workshop session | write |
| `workshops.sessions.update` | Edit workshop session | write |
| `workshops.sessions.delete` | Delete workshop session | write |
| `workshops.payments.create` | Create workshop payment | write |
| `workshops.payments.update` | Edit workshop payment | write |
| `workshops.payments.delete` | Delete workshop payment | write |

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
| `classes.remove_student` | Remove student from class | write |
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

### Gallery

| Key | Label | Access |
|-----|-------|--------|
| `gallery.view` | View gallery images | read |
| `gallery.create` | Create gallery image | write |
| `gallery.update` | Edit gallery image | write |
| `gallery.delete` | Delete gallery image | write |

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
| `accounting.income_statement.view` | View income statement | read |
| `accounting.transactions.create` | Record external transaction | write |
| `accounting.transactions.update` | Edit external transaction | write |
| `accounting.transactions.delete` | Delete external transaction | write |
| `accounting.payment_phases.create` | Create payment phase | write |
| `accounting.payment_phases.update` | Edit payment phase | write |
| `accounting.payment_phases.cancel` | Cancel payment phase | write |
| `accounting.spp.transfer` | Transfer student payment phase | write |
| `accounting.spp.delete` | Delete student payment phase (payment-free only) | write |
| `accounting.payments.create` | Record student payment | write |
| `accounting.payments.update` | Edit student payment | write |
| `accounting.payments.delete` | Delete student payment | write |
| `accounting.adjustments.create` | Create financial adjustment | write |
| `accounting.adjustments.update` | Edit financial adjustment | write |
| `accounting.adjustments.delete` | Delete financial adjustment | write |

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

### Cloudflare AI usage

| Key | Label | Access |
|-----|-------|--------|
| `cloudflare_ai_usage.view` | View Cloudflare AI usage logs | read |

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

### RBAC

| Key | Label | Access |
|-----|-------|--------|
| `rbac.manage` | Manage role permissions | write |

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
<!-- ======================================== -->
instructors.view
instructors.create
instructors.delete
instructors.capabilities.update

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

<!-- ======================================== -->

classes.view
classes.create
classes.update
classes.change_status
classes.assign_teacher
classes.unassign_teacher
classes.add_student
classes.remove_student
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
gallery.view
gallery.create
gallery.update
gallery.delete
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
accounting.income_statement.view
accounting.transactions.create
accounting.transactions.update
accounting.transactions.delete
accounting.payment_phases.create
accounting.payment_phases.update
accounting.payment_phases.cancel
accounting.spp.transfer
accounting.spp.delete
accounting.payments.create
accounting.payments.update
accounting.payments.delete
accounting.adjustments.create
accounting.adjustments.update
accounting.adjustments.delete

reports.view
reports.export
reports.print
analytics.view
backup.view
backup.export_table
backup.export_full
backup.download
logs.view
cloudflare_ai_usage.view
cron_jobs.view
settings.view
settings.maintenance
settings.update_credentials
rbac.manage
```

**Count:** 127 keys · all unique · naming consistent · accounting includes phase/payment/adjustment/transaction writes and income statement view · instructors includes view / create / delete / capabilities update · workshops includes CRUD plus status / instructors / documents / sessions / payments module writes (incl. `workshops.payments.view`).

### is_instructor — shared seed package

Roles with `profiles.is_instructor` use these grants for shared Manage workshops UI (seed: `WORKSHOP_ACCESS_SEED_PERMISSIONS`). Nav/route also requires the flag + matching `*.view`.

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

### CEO — workshop / instructor module seed

CEO seed (`CEO_WORKSHOP_SEED_PERMISSIONS`): full instructors + schedules CRUD + workshops module (incl. payments) + `cloudflare_ai_usage.view` (Schedule assistant).

```
instructors.view
instructors.create
instructors.delete
instructors.capabilities.update
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
```

---

## Change rule

New feature or action → add a row here first (see `.cursor/rules/rbac.mdc`), then add the same key to `lib/constants/permissions.ts`.
