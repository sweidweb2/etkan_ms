# Workshops — Implementation Plan

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Status UI | Checkpoint stepper; **next** and **back** require confirmation modal |
| Status order | `draft → proposal → scheduled → in_progress → completed`; `cancelled` via explicit action |
| Advance to `scheduled` | Require `start_date` (and `end_date` if set) **in the future** |
| Delete workshop | **Hard delete** workshop + children (DB cascade) + remove Storage objects; **blocked if any `workshop_payments` exist** |
| Instructors source | `profiles.is_instructor = true` only |
| Instructor orphan | If user loses instructor flag or is deleted → remove `workshop_instructors` row (and handle knock-on) |
| Documents | Public bucket `workshops`; delete DB row **and** Storage object |
| Payments | Ledger CRUD (`debit` / `credit`); reuse accounting payment methods |
| Schedules CTA | Navigate to existing `/manager/instructor-schedules` |
| Routes | List → detail → payments sub-route |
| Permissions | `workshops.view/create/update/delete` (nested actions under these) |
| Validation | Front + back (Zod); Vitest on validators + services |

Schema ref: [tables.md](./tables.md).  
Note: `deleted_at` exists but **v1 uses hard delete** — ignore column (optional later cleanup migration).

---

## Routes & UI map

| Route | UI |
|-------|----|
| `/manager/workshops` | Cards list + Create |
| `/manager/workshops/[id]` | Detail: stepper, edit, instructors, documents, CTAs (Payments, Schedules) |
| `/manager/workshops/[id]/payments` | Payments CRUD |
| `/manager/instructor-schedules` | Existing page (link only) |

---

## Phase 0 — Foundations

Already done: tables, empty page, nav, RBAC seed, backup list.

**Tasks**

- [x] Constants: workshop statuses, instructor roles, wage types, payment types/methods wrappers
- [x] Domain types under `types/manager-workshop.ts`
- [x] Zod validators + Vitest (`lib/validators/manager/workshop*.ts`)
- [x] Storage: ensure public bucket `workshops` + path helper `workshops/{workshopId}/{uuid}-{safeName}`
- [x] Drop or ignore `deleted_at` in app queries (always hard delete)

---

## Phase 1 — Workshop CRUD (list + create/edit/delete)

**Tasks**

- [x] Repository: list / find / create / update / delete workshops
- [x] Service: authz (`workshops.*`), validation, audit logs
- [x] Server actions for create / update / delete
- [x] List page: cards (status badge, dates, price) + Create dialog
- [x] Detail route shell: load workshop, Edit dialog, Delete confirm (hard delete)
- [x] Vitest: service create/update/delete + authz failures

**Exit:** Manager can create, edit, open, and hard-delete a workshop (delete blocked when payments exist).

---

## Phase 2 — Status stepper

**Tasks**

- [x] Status transition helpers: next / previous / cancel; allowed graph
- [x] Rule: move to `scheduled` only if `start_date > today` (and `end_date >= start_date` if present)
- [x] Service action: `changeWorkshopStatus` with confirmation payload from client
- [x] UI: checkpoint stepper on detail; confirm modal for next, back, and cancel
- [x] Vitest: valid/invalid transitions + scheduled date rule

**Exit:** Status changes only via confirmed stepper (or cancel), with date guard.

---

## Phase 3 — Workshop instructors

**Tasks**

- [ ] Repository CRUD for `workshop_instructors`
- [ ] Candidates query: `is_instructor = true`, not already assigned
- [ ] Service: add / update / remove; enforce unique user; validate role + wage
- [ ] When `is_instructor` flipped off (user update path): delete that user’s workshop_instructor rows
- [ ] Profile delete: rely on FK `on delete cascade` (verify); document in service comments
- [ ] Detail UI: list + add/edit/remove dialogs
- [ ] Vitest: add/remove, duplicate user blocked, non-instructor rejected, flag-off cleanup

**Exit:** Instructors fully managed on detail; orphans cleaned when flag changes.

---

## Phase 4 — Documents (Storage)

**Tasks**

- [ ] Upload via server action: validate file → Storage upload → insert `workshop_documents`
- [ ] List + download (public URL) + rename/metadata update if needed + delete (DB + Storage)
- [ ] On workshop hard delete: list paths → remove Storage objects → delete workshop row (cascade docs)
- [ ] Detail UI: documents section
- [ ] Vitest: path helper, delete cleans storage (mocked client), authz

**Exit:** Syllabus-style files upload/list/delete against public `workshops` bucket.

---

## Phase 5 — Payments page

**Tasks**

- [ ] Route `/manager/workshops/[id]/payments`
- [ ] Repository + service CRUD for `workshop_payments`
- [ ] UI: table + create/edit/delete; type debit/credit; payment method select
- [ ] Optional summary: credits − debits vs workshop `price`
- [ ] Detail CTA button → payments route
- [ ] Vitest: validation + service CRUD + authz

**Exit:** Full payments ledger for a workshop.

---

## Phase 6 — Schedules CTA + polish

**Tasks**

- [ ] Detail button → `ROUTES.MANAGER_INSTRUCTOR_SCHEDULES` (gated by `instructor_schedules.view` if desired)
- [ ] Empty/error states, toasts, pending-aware dialogs (project form-dialog rules)
- [ ] Permission checks on all mutations via `Can` / service `requirePermission`
- [ ] Smoke: list → detail → status → instructors → docs → payments → schedules link

**Exit:** Feature usable end-to-end in manager panel.

---

## Permission mapping (v1)

| Action | Permission |
|--------|------------|
| List / detail / payments view | `workshops.view` |
| Create workshop | `workshops.create` |
| Edit fields, status, instructors, docs, payments | `workshops.update` |
| Hard delete workshop (and cascading cleanup) | `workshops.delete` |
| Create/delete payment or document rows | `workshops.update` (create workshop already separate) |

---

## Test checklist (per phase)

- Zod: happy path + each invalid field
- Service: permission denied, not found, business rule failures
- Status: next/back/cancel + future-date rule for `scheduled`
- Instructors: only `is_instructor`; unique; flag-off cleanup
- Documents: upload/delete with Storage mock
- Payments: debit/credit amounts, methods

---

## Out of scope (v1)

- Soft delete / restore
- Nested RBAC keys (`workshops.payments.*`)
- Preselect instructor on schedules page (`?instructorId=`)
- FK from workshop `subject` → `subjects`
- Auto wage → accounting transactions sync
