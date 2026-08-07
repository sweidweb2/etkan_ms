# RBAC — Role seeded permissions

Default grants applied by `npm run seed:rbac` from `lib/constants/role-seed-permissions.ts`.

Seed **replaces** each role’s grants (clears previous, then writes the package below).

---

## Manager

Full catalog (`PERMISSION_KEYS`) — every permission.

---

## CEO

Full instructors / instructor schedules / workshops module (incl. payments) plus AI usage for Schedule assistant and income statement analytics (`CEO_WORKSHOP_SEED_PERMISSIONS`):

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
accounting.income_statement.analytics.view
```

Shared pages: `/manager/workshops*`, `/manager/instructor-schedules*`, `/manager/instructors`, `/manager/cloudflare-ai-usage`, `/manager/income-statement/analytics`.  
Manage instructors and AI usage do **not** require `is_instructor`. Workshop/schedule shared UI still does.  
Schedule assistant UI/API and AI usage page require `cloudflare_ai_usage.view`.  
Slot details table (`/manager/instructor-schedules/details`) requires `instructor_schedules.details.view` (manager + CEO seed only for now).

---

## Other roles (admin, co-manager, teacher, trainer, student)

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

**List / detail scoping:** Manager and CEO see **all** workshops. Other roles only see workshops where they are assigned in `workshop_instructors`.
