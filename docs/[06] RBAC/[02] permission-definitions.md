# RBAC — Permission Definitions (frozen)

**Status:** Phase 0–1 complete — frozen list lives in code at `lib/constants/permissions.ts`.  
**Baseline:** manager panel capabilities.  
**Roles co-manager:** empty seed (zero grants) — see `[08] role-seeded-permissions.md`.  
**Role supervisor:** empty `/supervisor` panel; seeded allow-list: workshops + subjects (categories/exercises) + students + classes tree + instructor schedules + academic analysis (see `[08]`). Uses full manager nav filtered by grants — RBAC extras unlock UI/routes. No new permission keys.  
**Role CRM:** empty `/crm` panel; seeded with all `guests.*` + all `teams.*` + full `registrations.*` for shared `/manager/guests*` and dossier/details (see `[08]`). No new permission keys.  
**Role teacher:** class-tree grants only; own-class scoping in services (see `[08]`).  
**Role student:** `students.view_own` + class/session/task reads + `accounting.view` / `payment_schedules.view` for own SPPs (see `[08]`).

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

Dashboard · Users · Students · Subjects · Classes · Sessions · Attendance · Tasks · Final Exams · Grades · Semesters · Equipment · Gallery · Projects · Blogs · Workshops · Notifications · Emailing · Accounting · Payment schedules · Reports · Backup · Logs · Cloudflare AI usage · Registrations · Guests · Teams · Cron Jobs · Settings · RBAC

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
| `students.view_own` | View own student profile (student panel) | read |
| `students.create` | Create student | write |
| `students.update` | Edit student | write |
| `students.change_status` | Activate / inactivate student (optional class leave + payment-free open SPP delete) | write |

### Subjects

| Key | Label | Access |
|-----|-------|--------|
| `subjects.view` | View subjects | read |
| `subjects.create` | Create subject | write |
| `subjects.update` | Edit subject | write |
| `subjects.delete` | Delete subject | write |
| `subjects.categories.view` | View subject categories | read |
| `subjects.categories.create` | Create subject category | write |
| `subjects.categories.update` | Edit subject category | write |
| `subjects.categories.delete` | Delete subject category | write |
| `subjects.exercises.view` | View subject exercises | read |
| `subjects.exercises.create` | Create subject exercise | write |
| `subjects.exercises.update` | Edit subject exercise | write |
| `subjects.exercises.delete` | Delete subject exercise | write |

### Instructors

| Key | Label | Access |
|-----|-------|--------|
| `instructors.view` | View instructors | read |
| `instructors.create` | Add instructors (`is_instructor` on) | write |
| `instructors.delete` | Remove instructors (`is_instructor` off) | write |
| `instructors.capabilities.update` | Update instructor subject capabilities | write |
| `instructors.subjects.create` | Create instructor subjects | write |
| `instructors.subjects.update` | Update instructor subjects (rename + reorder) | write |
| `instructors.subjects.delete` | Delete instructor subjects | write |

### Mentors

| Key | Label | Access |
|-----|-------|--------|
| `mentors.view` | View mentors | read |
| `mentors.create` | Add mentors (`is_mentor` on) | write |
| `mentors.delete` | Remove mentors (`is_mentor` off) | write |
| `mentors.capabilities.update` | Update mentor subject capabilities | write |
| `mentors.subjects.create` | Create mentor subjects | write |
| `mentors.subjects.update` | Update mentor subjects (rename + reorder) | write |
| `mentors.subjects.delete` | Delete mentor subjects | write |

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
| `workshops.payments.view` | View workshop payments | read |
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
| `tasks.view` | View tasks and open student task upload signed URLs | read |
| `tasks.create` | Create task | write |
| `tasks.update` | Edit task | write |
| `tasks.update_student` | Edit student task (status, grade, notes, student report) and manage student task file uploads | write |
| `tasks.delete` | Delete task | write |

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

### Projects

| Key | Label | Access |
|-----|-------|--------|
| `projects.view` | View public projects | read |
| `projects.create` | Create public project | write |
| `projects.update` | Edit public project | write |
| `projects.delete` | Delete public project | write |

### Blogs

| Key | Label | Access |
|-----|-------|--------|
| `blogs.view` | View blogs | read |
| `blogs.create` | Create blog | write |
| `blogs.update` | Edit blog | write |
| `blogs.delete` | Delete blog | write |

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
| `accounting.income_statement.analytics.view` | View income statement analytics | read |
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

### Academic analysis

| Key | Label | Access |
|-----|-------|--------|
| `academic_analysis.view` | View academic analysis | read |

### Payment schedules

| Key | Label | Access |
|-----|-------|--------|
| `payment_schedules.view` | View payment schedules | read |
| `payment_schedules.create` | Create payment schedule | write |
| `payment_schedules.update` | Edit payment schedule | write |
| `payment_schedules.delete` | Delete payment schedule | write |

### Backup

| Key | Label | Access |
|-----|-------|--------|
| `backup.view` | View backup history | read |
| `backup.export_table` | Export table backup | write |
| `backup.export_full` | Export full backup | write |
| `backup.export_storage` | Export storage images | write |
| `backup.download` | Download backup file | write |

### Logs

| Key | Label | Access |
|-----|-------|--------|
| `logs.view` | View audit logs | read |

### Cloudflare AI usage

| Key | Label | Access |
|-----|-------|--------|
| `cloudflare_ai_usage.view` | View Cloudflare AI usage logs | read |

### Registrations

| Key | Label | Access |
|-----|-------|--------|
| `registrations.view` | View registration applications | read |
| `registrations.update_status` | Update registration application status and notes | write |

### Guests

| Key | Label | Access |
|-----|-------|--------|
| `guests.view` | View guests and status history | read |
| `guests.create` | Create guests | write |
| `guests.update` | Update guest intake fields and notes | write |
| `guests.delete` | Hard-delete guests | write |
| `guests.change_status` | Set profile status; record or remove pipeline statuses | write |
| `guests.registration.manage` | Open, rotate, or stop invite; cancel or hard-delete application; staff-fill; connect a dossier to a user | write |
| `guests.create_student` | Create a student from a guest registration | write |

### Teams

| Key | Label | Access |
|-----|-------|--------|
| `teams.view` | View guest teams and their members | read |
| `teams.create` | Create teams | write |
| `teams.update` | Edit team name, expected start date, and status | write |
| `teams.delete` | Delete teams and release their guests | write |
| `teams.assign_guest` | Assign guests to a team or remove them from one | write |

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
| `settings.reset_passwords` | Reset user passwords | write |

### RBAC

| Key | Label | Access |
|-----|-------|--------|
| `rbac.manage` | Manage role permissions | write |

**Notes**

- `npm run seed:rbac` seeds the catalog + `role_permissions` only.
- Effective permissions are role grants only (`role_permissions[profiles.role]`).

---

## Key index (unique)

```
dashboard.view
users.view
users.create
users.update
students.view
students.view_own
students.create
students.update
students.change_status
subjects.view
subjects.create
subjects.update
subjects.delete
subjects.categories.view
subjects.categories.create
subjects.categories.update
subjects.categories.delete
subjects.exercises.view
subjects.exercises.create
subjects.exercises.update
subjects.exercises.delete
<!-- ======================================== -->
instructors.view
instructors.create
instructors.delete
instructors.capabilities.update
instructors.subjects.create
instructors.subjects.update
instructors.subjects.delete

mentors.view
mentors.create
mentors.delete
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
tasks.update
tasks.update_student
tasks.delete
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
projects.view
projects.create
projects.update
projects.delete
blogs.view
blogs.create
blogs.update
blogs.delete
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
accounting.income_statement.analytics.view
academic_analysis.view
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
payment_schedules.view
payment_schedules.create
payment_schedules.update
payment_schedules.delete

backup.view
backup.export_table
backup.export_full
backup.export_storage
backup.download
logs.view
cloudflare_ai_usage.view
registrations.view
registrations.update_status
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
cron_jobs.view
settings.view
settings.maintenance
settings.update_credentials
settings.reset_passwords
rbac.manage
```

**Count:** 162 keys · all unique · naming consistent · accounting includes phase/payment/adjustment/transaction writes and income statement view · academic analysis includes view · payment schedules includes view/create/update/delete · instructors includes view / create / delete / capabilities update · workshops includes CRUD plus status / instructors / documents / sessions / payments module writes (incl. `workshops.payments.view`) · registrations includes view / update_status · guests includes view / create / update / delete / change_status / registration.manage / create_student · projects includes view / create / update / delete · blogs includes view / create / update / delete · students includes `students.view_own` for the student panel.

### is_instructor / is_mentor — shared Manage workshops access

`profiles.is_instructor` **or** `profiles.is_mentor` unlocks shared Manage workshops UI (list + detail) when the user also has `workshops.view`.

- Admin seed still includes `WORKSHOP_ACCESS_SEED_PERMISSIONS` (view + sessions/documents writes + instructor/schedule views). Other roles get workshops via their own matrix (see `[08]`).
- Nav/route gate: `(is_instructor || is_mentor)` + matching `*.view`. Supervisor is treated as allowed without the flags.

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

CEO seed (`CEO_WORKSHOP_SEED_PERMISSIONS`): full instructors + schedules CRUD + workshops module (incl. payments) + `cloudflare_ai_usage.view` (Schedule assistant) + `accounting.income_statement.analytics.view` + `academic_analysis.view` + all `guests.*` + `registrations.view` (open a registration dossier from guest details).

```
instructors.view
instructors.create
instructors.delete
instructors.capabilities.update
instructors.subjects.create
instructors.subjects.update
instructors.subjects.delete
mentors.view
mentors.create
mentors.delete
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
academic_analysis.view
guests.view
guests.create
guests.update
guests.delete
guests.change_status
guests.registration.manage
guests.create_student
registrations.view
```

---

## Change rule

New feature or action → add a row here first (see `.cursor/rules/rbac.mdc`), then add the same key to `lib/constants/permissions.ts`.
