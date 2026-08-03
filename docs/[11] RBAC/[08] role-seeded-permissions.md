# RBAC — Role seeded permissions

Default grants applied by `npm run seed:rbac` from `lib/constants/role-seed-permissions.ts`.

Shared workshop access package (`WORKSHOP_ACCESS_SEED_PERMISSIONS`) is included for **every non-manager role**:

- `workshops.view`
- `workshops.sessions.create` / `update` / `delete`
- `workshops.documents.create` / `update` / `delete`
- `instructors.view` (covers reading instructor capabilities)
- `instructor_schedules.view`

The old `instructor_portal.*` package was removed. Workshop/instructor UI for non-managers will be wired later via shared manager routes when needed.

---

## Manager

Full catalog (`PERMISSION_KEYS`) — every permission.

---

## Admin

### Accounting
- `accounting.income_statement.view`

### Backup
- `backup.view`
- `backup.export_table`
- `backup.export_full`
- `backup.download`

### Plus
- Shared workshop access package

---

## CEO

Read/analysis-oriented manager grants plus full workshop module writes (create/update/delete, status, instructors, documents, sessions, payments) and instructor schedule CRUD. Includes shared workshop access package.

Key groups: dashboard, users, students, subjects (view/create/update), instructors (+ capabilities update), classes (+ analytics), sessions, attendance, tasks, final exams, grades, semesters, schedule, instructor schedules (CRUD), workshops (full module), accounting (+ income statement), analytics, cloudflare AI usage.

---

## Co-manager

Shared workshop access package only.

---

## Teacher

Shared workshop access package only.

---

## Trainer

Shared workshop access package only.

---

## Student

Shared workshop access package only.
