> **Historical / superseded.** Do not implement from this plan. Catalogs and defaults are stale (`started` default, `dropped`, auto-derived status). Current source of truth: [`feature-status-and-follow-up-tasks.md`](./feature-status-and-follow-up-tasks.md).

# [9.8] Guest follow-up — implementation plan

**Project:** Etkan MS (`etkan_ms`)  
**Feature:** Pre-user guest intake → status pipeline → one registration dossier → handoff to destination teams  
**Date:** 2026-08-16  
**Status:** Historical / superseded (see banner above)

**Panels:** Manager People group + CEO nav (shared `/manager/guests*` routes)  
**Public:** One-shot guest registration link (multi-step wizard; fill once)  
**Authz:** New `guests.*` permissions — seed **all** to **manager** (full catalog) and **CEO**

---

## 1. Goal

Track people **before** they become auth users / students / workshop participants:

1. Staff creates a **minimal guest** (intake card).
2. Staff advances a **non-linear** status pipeline (stepper + separate outcome statuses).
3. Staff opens a **single** full **registration dossier** (same shape as `student_registration_applications`) with a **public one-shot link**; staff may also fill it in-panel.
4. When the guest is **finished** (routed to another team), that team **manually** creates whatever entities they need from the dossier. **No automated conversion** to profiles, students, classes, or workshops.

---

## 2. Locked decisions

| Topic | Decision |
|-------|----------|
| Guest vs user | Guest is **not** an auth user / profile until some later manual process outside this feature |
| Guest fields (minimal) | `full_name`, `phone`, `age`, `school_or_university`, `education_level`, `interested_service` |
| Services (`interested_service`) | `etkan_roadmap` \| `private` \| `workshops` |
| Current status | Denormalized `guests.status` (always the latest) |
| Status history | `guest_status_events`: every change inserts a row (`status`, `note`, `created_by`, `created_at`) |
| Status graph | **Non-linear** — any status may be set from any other; nothing is required to advance |
| Stepper UI cards | Only pipeline statuses (see §3.1). `pending` / `rejected` / `dropped` are **not** stepper cards (separate actions / badges) |
| `finished` meaning | Guest no longer needs guest-handling follow-up; has been **routed to another team** to continue manually |
| Registration | **One** application per guest (`guest_id` unique when not null). Reuse / extend `student_registration_applications` |
| Who fills registration | **Both:** staff in panel **or** guest via public token link |
| Default guest status | **`started`** on create (initial history event = `started`) |
| Public link | One-shot (usable until submitted or invite stopped); multi-step pages (reuse / adapt `RegistrationWizard` pattern) |
| Application lifecycle | Application may be **`cancelled`** (status) **or hard-deleted**; after cancel/delete, staff may open a new one (still ≤1 active) |
| Invite lifecycle | Invite is **stop-only** (`cancelled_at` / invalidate) — **not** hard-deleted as a staff action; stopping the invite kills the public link |
| Prefill | Guest minimal fields prefill registration where they overlap; registration is source of truth after submit |
| Post-route automation | **None** — destination team recreates students / workshops / etc. by hand from dossier info |
| Uniqueness | **No** unique constraints on phone / name / etc. |
| Delete guest | **Hard delete** (cascade status events; clear or cascade linked application per §4) |
| Audit columns | `created_at`, `updated_at`, `created_by` on guests; events carry `created_by` + `created_at` |
| Nav placement | Manager → **People** → Guests (beside Registrations). CEO → Guests item pointing at same routes |
| Conversion to student | Out of scope for this feature |

---

## 3. Domain model

### 3.1 Guest statuses

**Pipeline (shown as stepper cards — clickable, non-linear):**

| Key | Label (UI) |
|-----|------------|
| `started` | Started |
| `finished_meeting` | Finished meeting |
| `finished_parent_meeting` | Finished parent meeting |
| `chose_plan` | Chose plan |
| `routed_correctly` | Routed correctly |
| `finishing_routing_doc` | Finishing routing doc |
| `finished` | Finished |

**Outcomes (not stepper cards — badge / menu actions):**

| Key | Label (UI) | Intent |
|-----|------------|--------|
| `pending` | Pending | Holding / not actively stepping |
| `rejected` | Rejected | Explicitly rejected |
| `dropped` | Dropped | Stopped / no-show / abandoned |

Default on create: **`started`**.

### 3.2 Registration application (guest-linked)

- Add nullable `guest_id` → `guests(id)`.
- **At most one row per guest** while that dossier exists: unique on `guest_id` (NULLs allowed for public walk-in registrations that are not guest-linked).
- Existing public `/register` walk-ins keep `guest_id = null`.
- **Application** may be **cancelled** (status) or **hard-deleted**.
- **Invite** may only be **stopped** (`cancelled_at`) — that invalidates the public link; staff do not hard-delete invites as a product action.
- Guest flow statuses on the application (extend check constraint as needed):

| Status | Meaning |
|--------|---------|
| `open` | Link issued / form editable; not yet submitted (guest path) |
| `pending` | Submitted; awaiting review (align with existing inbox) |
| `accepted` / `applied` / `missing` / `rejected` | Existing manager review statuses |
| `cancelled` | Staff cancelled this application dossier |

> Prefer invite token table + application created on open or first save/submit; see §4.2–4.3. Stopping the invite and cancelling/deleting the application are separate controls.

### 3.3 Interested services

| Key | Label |
|-----|-------|
| `etkan_roadmap` | Etkan roadmap |
| `private` | Private |
| `workshops` | Workshops |

Informational only for routing notes — **no FK** to semesters/workshops in v1.

---

## 4. Schema plan

### 4.1 `guests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `full_name` | text not null | |
| `phone` | text not null | not unique |
| `age` | integer not null | positive; or switch to `birth_date` later if needed |
| `school_or_university` | text | nullable |
| `education_level` | text not null | reuse registration education_level enum |
| `interested_service` | text not null | `etkan_roadmap` \| `private` \| `workshops` |
| `status` | text not null | current; default **`started`**; check ∈ all guest statuses |
| `notes` | text | optional summary note (free-form) |
| `created_by` | uuid | FK `profiles.id` on delete set null |
| `created_at` | timestamptz not null default now() | |
| `updated_at` | timestamptz not null default now() | |
| Soft delete | — | **none** (hard delete) |

Indexes: `status`, `created_at desc`, `interested_service` (list filters).

### 4.2 `guest_status_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `guest_id` | uuid not null | FK `guests.id` **on delete cascade** |
| `status` | text not null | status written at this event |
| `note` | text | optional per-change note |
| `created_by` | uuid | FK `profiles.id` on delete set null |
| `created_at` | timestamptz not null default now() | |

Index: `(guest_id, created_at desc)`.

On create guest: insert initial event for **`started`**, then set `guests.status = started`.  
On every status change: insert event **then** update `guests.status` (+ `updated_at`).

### 4.3 Guest registration invite (one-shot public link)

Mirror `student_financial_form_invites` pattern:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `guest_id` | uuid not null unique | one active invite concept per guest (or allow rotate by invalidating old) |
| `token` | text not null unique | public path param |
| `application_id` | uuid | FK application; set when draft/submit creates row |
| `created_by` | uuid | staff |
| `created_at` | timestamptz | |
| `used_at` | timestamptz | set when submitted (one-shot) |
| `cancelled_at` | timestamptz | staff **stop** invite (only invite lifecycle end besides `used_at`) |

Public route example: `/register/guest/[token]` (do not collide with `/register`).

**Invite rules:** stop-only for staff (`cancelled_at`); token invalid when stopped or used. Do not expose invite hard-delete in UI. Guest hard-delete may cascade-remove invite rows via FK.

### 4.4 Alter `student_registration_applications`

| Change | Detail |
|--------|--------|
| `guest_id` | uuid null → `guests(id)` on delete **cascade** (guest gone → dossier gone) |
| Unique | `unique (guest_id)` where guest_id is not null (partial unique index) |
| Status check | Add `open` / `cancelled` as needed for guest dossier lifecycle |
| Staff actions | Application: **cancel** (status) **or hard-delete**. Invite: **stop only** |

**Cardinality rule (product):** one guest ↔ one registration dossier. If application cancelled/hard-deleted (and invite stopped as needed), staff may create a new invite + application (still one *current* dossier).

### 4.5 RLS

- Tables: RLS enabled; panel access via service role / existing admin client patterns used by manager services (same as registrations).
- Public token submit: rate-limited server actions + admin client, same as public `/register`.

Update `docs/[05] Database/etkan-ms-schema-latest-dbdiagram.dbml` in the schema phase.

---

## 5. Permissions & nav

### 5.1 Feature key

Add `guests` to `PERMISSION_FEATURES` + labels.

### 5.2 Permission keys

| Key | Access | Label |
|-----|--------|-------|
| `guests.view` | read | View guests and status history |
| `guests.create` | write | Create guests |
| `guests.update` | write | Update guest intake fields / notes |
| `guests.delete` | write | Hard-delete guests |
| `guests.change_status` | write | Set guest status (stepper + pending/rejected/dropped) |
| `guests.registration.manage` | write | Open registration; stop invite; cancel/hard-delete application; staff-fill |

Update:

- `docs/[06] RBAC/[02] permission-definitions.md`
- `lib/constants/permissions.ts` (`PERMISSIONS` + `PERMISSION_DEFINITIONS`)
- Seed: manager already gets full catalog; **add all `guests.*` to `CEO_WORKSHOP_SEED_PERMISSIONS`** (or rename that seed pack later — for now append guest keys so CEO receives them)
- `docs/[06] RBAC/[08] role-seeded-permissions.md`

### 5.3 Nav & routes

| Route | UI |
|-------|----|
| `/manager/guests` | Table + Create guest |
| `/manager/guests/[id]` | Detail: intake edit, status stepper + outcome actions, history, registration section |
| `/register/guest/[token]` | Public multi-step registration (one-shot) |

- Manager nav: **People** group → **Guests** (near Registrations).
- CEO nav: add **Guests** → same href (permission-gated like other shared manager routes).
- `ROUTES` constants + panel search flatten helpers.

Existing **Registrations** inbox (`/manager/registrations`) remains for all applications; guest-linked rows show a guest badge / link when `guest_id` present.

---

## 6. UX map

### 6.1 List (`/manager/guests`)

- Filters: status, interested service, search (name/phone).
- Columns: name, phone, age, school/uni, education, service, current status, created at.
- Primary CTA: **Create guest** (dialog/sheet — form-dialog rules: pending-aware close, toast, success close).
- Row → detail.

### 6.2 Detail (`/manager/guests/[id]`)

Sections:

1. **Intake** — edit minimal fields + summary notes.
2. **Status stepper** — pipeline cards only; click sets that status (confirm + optional note). Separate controls for **Pending / Rejected / Dropped**.
3. **Status history** — timeline from `guest_status_events`.
4. **Registration** — states:
   - No dossier → **Open registration** (creates invite + copyable public link; optional staff-fill mode).
   - Open → show link, copy; **stop invite**; **cancel** and/or **hard-delete** application; staff wizard.
   - Submitted → link to application detail / inline read-only summary + status (cancel or hard-delete still allowed).
   - Application cancelled/deleted (invite stopped) → allow open again.

Hard delete guest: confirm dialog; cascade events + invite + application.

### 6.3 Public guest registration

- Multi-step wizard (same steps/pages pattern as `/register`).
- Token invalid if missing, invite stopped (`cancelled_at`), or already `used_at`.
- On successful submit: set `used_at`, application status → `pending` (or existing post-submit status), toast/redirect thank-you.
- Prefill from guest where possible; guest cannot change `guest_id`.

### 6.4 Toasts / loaders

- Follow workspace toast + form-dialog rules.
- Route top loader for navigations only; submit buttons use `InlineSpinner`.

---

## 7. Architecture (code)

Layering (project standard):

| Layer | Responsibility |
|-------|----------------|
| `app/(panels)/manager/guests/*` | Pages, actions |
| `app/(public)/register/guest/[token]/*` | Public wizard + actions |
| `components/...` | UI only |
| `services/guest.service.ts` (+ registration invite helpers) | Authz, validation, orchestration |
| `repositories/guest*.ts` | Supabase only |
| `lib/validators/manager/guest*.ts` | Zod |
| `lib/constants/guest*.ts` | Statuses, services, labels |
| `types/...` | Domain row types |

Reuse public registration validators/storage where the dossier fields match; branch only for token + `guest_id` + one-shot rules.

**No** auto-create of `profiles` / `student_profiles` / enrollments / workshop membership.

---

## 8. Phases & tasks

### Phase 0 — Spec freeze & docs

**Tasks**

- [x] Confirm default create status: **`started`**
- [x] Confirm lifecycle: application **hard-delete or cancel**; invite **stop-only**
- [x] This plan reviewed as source of truth

**Exit:** No open product questions blocking schema. ✅

---

### Phase 1 — Schema & RBAC foundations

**Tasks**

- [x] Migration: `guests`, `guest_status_events`, `guest_registration_invites`
- [x] Migration: `student_registration_applications.guest_id` + partial unique index
- [x] Extend application status check **only if** needed for `open` / `cancelled`
- [x] Update `etkan-ms-schema-latest-dbdiagram.dbml`
- [x] Constants: guest statuses, services, education reuse
- [x] Permissions + definitions doc + CEO seed all `guests.*`
- [x] Routes + manager/CEO nav entries (pages can be stubs)

**Exit:** Migrations apply; CEO/manager seeds include guests; nav links exist.

---

### Phase 2 — Guest CRUD (list + create + detail shell)

**Tasks**

- [x] Repository: list / get / create / update / hard delete
- [x] Service: authz + Zod + audit-friendly create (initial status event)
- [x] Actions + list page (table, filters, create dialog)
- [x] Detail shell: load guest, edit intake, delete confirm
- [x] Vitest: validators + service authz/CRUD

**Exit:** Staff can create/list/edit/delete guests.

---

### Phase 3 — Status stepper + history

**Tasks**

- [x] Service: `setGuestStatus` (any → any; write event + update current)
- [x] UI: pipeline stepper cards + Pending/Rejected/Dropped actions
- [x] Optional note modal on change
- [x] History timeline section
- [x] Vitest: non-linear sets; event ordering; permission failures

**Exit:** Status fully manual and auditable; non-stepper outcomes available.

---

### Phase 4 — Guest registration dossier (staff + public one-shot)

**Tasks**

- [x] Invite create / **stop** / rotate rules (one current dossier per guest)
- [x] Public `/register/guest/[token]` multi-step wizard (prefill from guest)
- [x] Staff-fill path from guest detail (same validators)
- [x] One-shot enforce: reject second submit; mark `used_at`
- [x] Application **cancel** + **hard-delete**; invite **stop-only**; allow re-open after
- [x] Manager registrations inbox: show guest link when `guest_id` set
- [x] Vitest: token lifecycle, uniqueness, authz for manage

**Exit:** Staff or guest can complete exactly one active dossier per guest via link or panel.

---

### Phase 5 — Polish, permissions QA, handoff UX

**Tasks**

- [x] Empty/error states; copy public link; thank-you page
- [x] Confirm CEO can view/manage guests end-to-end with seed
- [x] Docs: short handoff note on detail (“Finished = routed; no auto entities”)
- [x] Vitest + lint/typecheck green for touched modules
- [x] Optional: filter guests by `finished` / outcomes on list

**Exit:** Feature usable in production for intake → dossier → manual team handoff.

> Runtime note: if an existing DB is missing CEO guest permissions, re-run `npm run seed:rbac`.

---

## 9. Out of scope (v1)

- Auto-create auth users, student profiles, class/semester enrollment, workshop participants
- Payment / financial forms on guests
- Unique phone enforcement / merge-duplicate tools
- Soft delete / archive
- Required status order or required parent meeting
- Notifications / email automation on status change (can be a later phase)
- Separate CEO-only data scoping (CEO sees all guests, same as manager)

---

## 10. Test plan (summary)

Covered by Vitest (+ DB cascade in `20260820120000_guests.sql`). Copy-link / stepper card layout are UI-verified against the same rules.

- [x] Create guest → appears in table with status **`started`** + first history event
- [x] Set each pipeline status out of order; history correct; current status matches
- [x] Set pending / rejected / dropped without those appearing as stepper cards
- [x] Open registration → copy link → fill once as guest → second submit blocked
- [x] Staff-fill same dossier path
- [x] Stop invite → public link dead; cancel and/or hard-delete application → re-open new invite
- [x] Hard delete guest removes events + invite + application (cascade)
- [x] Manager without permission denied; CEO/manager with seed allowed
- [x] Walk-in `/register` still works with `guest_id` null

---

## 11. File checklist (expected touchpoints)

| Area | Paths (indicative) |
|------|--------------------|
| Migrations | `supabase/migrations/*_guests*.sql` |
| Schema doc | `docs/[05] Database/etkan-ms-schema-latest-dbdiagram.dbml` |
| RBAC docs | `docs/[06] RBAC/[02] permission-definitions.md`, `[08] role-seeded-permissions.md` |
| Permissions | `lib/constants/permissions.ts`, `role-seed-permissions.ts` |
| Nav / routes | `lib/constants/panel-nav.ts`, `routes.ts` |
| Constants | `lib/constants/guest*.ts` |
| Validators | `lib/validators/manager/guest*.ts`, public guest registration |
| Repos / services | `repositories/guest*.ts`, `services/guest.service.ts` |
| Panel UI | `app/(panels)/manager/guests/**`, components under `components/manager/guests/**` |
| Public UI | `app/(public)/register/guest/[token]/**` |
| Plan | this file |

---

## 12. Suggested implementation order

`Phase 1 → 2 → 3 → 4 → 5`  
Do not start public token work before guest CRUD + permissions exist.  
Do not automate post-`finished` entity creation — document handoff only.
