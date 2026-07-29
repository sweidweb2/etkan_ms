# Database Design — Version 1

Etkan MS domain schema lives in `supabase/migrations/20260602202331_initial.sql`. The app bedrock (auth + admin panel) still uses the template `users` table until repositories are migrated to `profiles`.

## Bedrock (app runtime today)

Auth and admin access rely on the template layer:

```text
auth.users (Supabase Auth)
  └── public.users (profile + role)   ← used by auth services today
```

Run `npm run seed:admin` to create the first admin after applying migrations that include the `users` table and RLS policies.

## Domain schema (migration)

The initial migration defines the Etkan MS data model:

| Area | Tables |
| --- | --- |
| Identity | `profiles`, `student_profiles` |
| RBAC | `permissions`, `role_permissions` |
| Relationships | `relationships` |
| Academics | `subjects`, `classes`, `class_teacher`, `student_class`, `tasks`, `student_tasks`, `student_course_grade` |
| Equipment | `equipments`, `borrow_equipment` |
| Other | `student_takeouts`, `audit_logs`, `email_sent`, `email_users` |

Canonical SQL is in `supabase/migrations/`. Regenerate `types/supabase.ts` after schema changes.

RBAC tables store the permission catalog and which `profiles.role` values may use each key. Seed with `npm run seed:rbac` after migrations (manager gets all permissions; other roles start empty).

## Next steps

1. Align auth repositories with `profiles` (replace legacy `users` table usage).
2. Add RLS policies per role (`admin`, `teacher`, `student`).
3. Build admin features on top of the panel shell.
