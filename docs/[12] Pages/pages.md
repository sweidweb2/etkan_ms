# Pages — skeleton & progressive loading checklist

Track each page as we replace the center **spinner** with **skeletons** and (later) **section-by-section** loading.

**Legend**

| Mark | Meaning |
|------|---------|
| `[ ]` | Still uses panel spinner (or no tailored skeleton) |
| `[~]` | Route `loading.tsx` uses a shared skeleton template |
| `[x]` | Skeleton + progressive Suspense sections done |

**Templates** (from `@/components/loaders/skeletons`): `list` · `cards` · `detail` · `calendar` · `dashboard` · `form`

---

## Manager / shared manager UI

| Done | Page | Path | Template |
|------|------|------|----------|
| [~] | Users | `/manager/users` | list |
| [~] | User detail | `/manager/users/[id]` | detail |
| [~] | Students | `/manager/students` | list |
| [~] | Student detail | `/manager/students/[id]` | detail |
| [~] | Subjects | `/manager/subjects` | list |
| [~] | Subject catalog | `/manager/subjects/catalog` | list / form |
| [~] | Subject detail | `/manager/subjects/[id]` | detail |
| [~] | Instructors | `/manager/instructors` | list |
| [~] | Instructor schedules | `/manager/instructor-schedules` | calendar |
| [~] | Schedule slot details | `/manager/instructor-schedules/details` | list |
| [~] | Workshops | `/manager/workshops` | list / cards |
| [~] | Workshop detail | `/manager/workshops/[id]` | detail |
| [~] | Workshop payments | `/manager/workshops/payments` | list |
| [~] | Accounting | `/manager/accounting` | list |
| [~] | Payment phase detail | `/manager/accounting/phases/[id]` | detail |
| [~] | SPP detail | `/manager/accounting/phases/[id]/students/[sppId]` | detail |
| [~] | Income statement | `/manager/income-statement` | list / dashboard |
| [~] | Income statement history | `/manager/income-statement/history` | list / dashboard |
| [~] | Income analytics | `/manager/income-statement/analytics` | dashboard |
| [~] | Weekly schedule | `/manager/schedule` | calendar |
| [~] | Classes | `/manager/classes` | list |
| [~] | Class detail | `/manager/classes/[id]` | detail |
| [~] | Class grades | `/manager/classes/[id]/grades` | list |
| [~] | Student grades detail | `/manager/classes/[id]/grades/students/[studentId]` | detail |
| [~] | Session detail | `/manager/classes/[id]/sessions/[sessionId]` | detail |
| [~] | Session task detail | `.../sessions/[sessionId]/tasks/[taskId]` | detail |
| [~] | Equipments | `/manager/equipments` | list |
| [~] | Equipment detail | `/manager/equipments/[id]` | detail |
| [~] | Borrow equipment | `/manager/equipments/borrow` | list |
| [~] | Gallery | `/manager/gallery` | cards |
| [~] | Projects | `/manager/projects` | list |
| [~] | Project detail | `/manager/projects/[id]` | detail |
| [~] | Relationships | `/manager/relationships` | list |
| [~] | Semesters | `/manager/semesters` | list |
| [~] | Semester detail | `/manager/semesters/[id]` | detail |
| [~] | Notifications | `/manager/notifications` | list |
| [~] | Emailing | `/manager/emailing` | list |
| [~] | Compose email | `/manager/emailing/compose` | form |
| [~] | Sent | `/manager/sent` | list |
| [~] | Sent detail | `/manager/sent/[id]` | detail |
| [~] | Settings | `/manager/settings` | form |
| [~] | Backup | `/manager/backup` | form / list |
| [~] | Logs | `/manager/logs` | list |
| [~] | Cloudflare AI usage | `/manager/cloudflare-ai-usage` | list |
| [~] | Cron jobs | `/manager/cron-jobs` | list |
| [~] | RBAC | `/manager/rbac` | list / form |

CEO / co-manager often reuse the same manager routes via the shared panel — tick the manager row when that URL is migrated.

---

## Admin

| Done | Page | Path | Template |
|------|------|------|----------|
| [ ] | Dashboard | `/admin/dashboard` | dashboard |

---

## Teacher

| Done | Page | Path | Template |
|------|------|------|----------|
| [ ] | Dashboard | `/teacher/dashboard` | dashboard |
| [ ] | Schedule | `/teacher/schedule` | calendar |
| [ ] | Classes | `/teacher/classes` | list |
| [ ] | Subjects | `/teacher/subjects` | list |
| [ ] | Students | `/teacher/students` | list |
| [ ] | Notifications | `/teacher/notifications` | list |
| [ ] | Analytics | `/teacher/analytics` | dashboard |

---

## Student

| Done | Page | Path | Template |
|------|------|------|----------|
| [ ] | Dashboard | `/student/dashboard` | dashboard |
| [ ] | Classes | `/student/classes` | list |
| [ ] | Finance | `/student/finance` | list / dashboard |
| [ ] | Activity | `/student/activity` | list |
| [ ] | Analytics | `/student/analytics` | dashboard |
| [ ] | Notifications | `/student/notifications` | list |

---

## How to move one page

1. Pick a row above; set template if unsure.
2. Point that route’s `loading.tsx` at the matching `Panel*PageSkeleton`.
3. Later: split the page with `Suspense` so heavy sections get their own skeleton (see [skeleton-loading-plan.md](./skeleton-loading-plan.md)).
4. Mark `[~]` then `[x]` when done.
