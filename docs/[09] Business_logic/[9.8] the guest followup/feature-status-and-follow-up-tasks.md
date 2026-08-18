# [9.8] Guest follow-up — status report and follow-up tasks

**Project:** Etkan MS  
**Date:** 2026-08-17  
**Scan type:** Code + unit tests (not a live browser pass)  
**Verdict:** The feature is **shipped and working**. Happy path (create → profile → pipeline while pending → invite → public/staff fill → cancel/delete app → delete guest) is coherent. Remaining items are copy mistakes, a failing nav test, and a few consistency/edge-case bugs. None of them block the main workflow.

The original [`implementation-plan.md`](./implementation-plan.md) is **historical / stale**. It still describes `started` as the default, `dropped` as a profile status, auto-derived current status, and an initial `started` event on create. This file is the current source of truth.

---

## 1. Current product model (what the code does)

| Layer | Catalog | Behavior |
|-------|---------|----------|
| **Profile** (`guests.status`) | `scheduled` \| `pending` \| `cancelled` \| `rejected` \| `finished` | Default on create: **`scheduled`**. Staff may set any → any. Recording pipeline `finished` also sets profile to **`finished`**. |
| **Pipeline log** (`guest_status_events.status`) | `started`, `finished_meeting`, `finished_parent_meeting`, `chose_plan`, `routed_correctly`, `finishing_routing_doc`, `finished` | Record **only while profile is `pending`**. Remove while `pending` or `finished`. Removing a step from a **finished** guest reopens the profile to **pending**. Cancelled / rejected / scheduled keep the schema locked. Recording pipeline `finished` flips profile to finished. Create writes **no** initial event. |
| **Registration** | One invite row per guest; one **non-cancelled** application per guest | Invite-first; public one-shot `/register/guest/[token]`; staff fill; invite is stop-only; cancel or hard-delete application; reopen after. |
| **Delete guest** | DB cascade + storage cleanup | Fail-closed: if document files cannot be removed, the guest row is **not** deleted. |
| **Conversion** | Manager create-student from a filled registration | On guest details, when a non-cancelled application exists and is not yet linked, staff can **Create student**. Prefills `full_name`, `email`, `phone`, `date_of_birth`. Username is required; password is optional and defaults to `"password"` if both fields are blank. Reuses `createStudent`. Always records pipeline `routed_correctly`, `finishing_routing_doc`, and `finished` (without auto-flipping profile). Toggle **Mark guest as finished** sets `guests.status` to `finished`. Links `application.user_id` to the new student. **Create student** is hidden once a user is already linked. **Connect to user** is independent of guest profile status: it appears whenever an active registration exists (pending, finished, etc.). Permission: `guests.create_student` (manager full catalog; not seeded to CEO). |

**Who:** Manager (full catalog, including `guests.create_student`) and CEO (`guests.*` except `guests.create_student`). Shared routes under `/manager/guests*`.

---

## 2. What is working

### Intake and CRUD

- [x] Create guest with minimal fields (`full_name`, `phone`, `age`, `school_or_university`, `education_level`, `interested_service`, `notes`)
- [x] Default profile status is `scheduled`; **no** pipeline event on create
- [x] Update intake fields from the detail page
- [x] Hard-delete guest with confirm dialog + staged checklist
- [x] Delete cleans registration storage **before** the row (fail-closed)
- [x] DB cascade removes events, invite, and linked applications
- [x] List page: search, profile-status filter, service filter, pagination, detail link
- [x] Toasts on mutations; `guest_deleted` URL toast after redirect

### Profile vs pipeline

- [x] Profile buttons in the schema footer: any → any, with confirm + optional note (audit only)
- [x] Pipeline schema is `@xyflow/react`; click idle node → record; click done node → remove
- [x] Pipeline record rejected unless profile is `pending` (service + UI lock copy)
- [x] Pipeline remove allowed while `pending` or `finished`; finished → pending on remove
- [x] Cancelled / rejected / scheduled keep the schema locked
- [x] Duplicate pipeline node is a no-op success (“already recorded”)
- [x] Recording pipeline `finished` sets profile to finished
- [x] History list shows pipeline events only (newest first)

### Registration dossier

- [x] Open / reopen invite (token rotate, clear `application_id` / `used_at` / `cancelled_at`)
- [x] Stop invite (no invite hard-delete)
- [x] Block a second active application until cancel/delete
- [x] Public one-shot wizard with prefill; invalid / stopped / used states
- [x] Staff fill in a sheet; submit marks invite used
- [x] Guest badge + link on the registrations inbox and application detail
- [x] Unique partial index: at most one non-cancelled application per `guest_id`
- [x] Create student from a filled registration (prefill mapped fields, optional password, link user, record routing pipeline steps, optional profile finished)
- [x] Connect to user whenever an active registration exists (independent of guest profile status); Create student is hidden once linked

### Authz, nav, docs that match code

- [x] Permissions: `guests.view` / `create` / `update` / `delete` / `change_status` / `registration.manage` / `create_student`
- [x] Seeded to **manager** (full catalog). CEO gets guest follow-up keys except `guests.create_student`.
- [x] Manager People nav + CEO Guests item; route guard on `/manager/guests*`
- [x] RBAC docs and DBML catalogs match the split model
- [x] Create-table migration (`20260820120000`) already uses the final catalogs; `221` is the live-DB override

### Tests that pass

- [x] `services/guest.service.test.ts` (26) — including pending add gate, finished remove → pending, delete storage cleanup
- [x] `services/guest-registration.service.test.ts` (17)
- [x] Guest constants / validators / route-permission / role-seed / permissions tests

---

## 3. What is not working (or incomplete)

Nothing in the core domain is broken. These are the real gaps found.

| Sev | Issue | Why it matters | Where |
|-----|--------|----------------|-------|
| **P1** | Nav filter test fails: `expected 28 to be 29` | CI / `vitest` red. Guests link is hidden unless `guests.view` is in the “all views” set. **Product nav still works** for manager/CEO (they have the permission). | `lib/auth/filter-panel-navigation.test.ts` — `allViews` is missing `PERMISSIONS.GUESTS_VIEW` |
| **P2** | Create-guest copy still says status starts as **Started** | Wrong default; should be **Scheduled**. Confuses staff. | `components/manager/guests/add-guest-dialog.tsx` |
| **P2** | Staff-fill **Sheet** can be dismissed mid-submit | `usePendingAwareOpenChange(false, …)`; close button stays visible. Violates form-dialog rules; user can abandon an in-flight submit. | `components/manager/guests/guest-registration-section.tsx` |
| **P2** | Hard-delete **application** ignores storage delete errors | Guest delete fail-closes; application delete does not. Orphan files possible. | `deleteGuestRegistrationApplicationForManager` in `services/guest-registration.service.ts` |
| **P3** | Cancel application only uses `invite.application_id` | Delete falls back to the active app; cancel does not. If the invite pointer is null but an active dossier exists, cancel can say “no application” while the UI still shows one. | same service — `cancelGuestRegistrationApplicationForManager` |
| **P3** | History subtitle implies every change is an event | Profile changes are audit-log only, not in this list. | `components/manager/guests/guest-status-history.tsx` |
| **P3** | Dead guest temp-upload action | Wizard uses the shared student-registration temp upload. Unused export; not a runtime break. | `app/(public)/register/guest/[token]/actions.ts` → `tempUploadGuestRegistrationDocumentAction` |
| **P3** | No `loading.tsx` on public guest register | Same as `/register` (also none). Minor; only `/auth` has a public loader. | `app/(public)/register/guest/[token]/` |
| **docs** | `implementation-plan.md` describes the old model | Anyone following it will implement the wrong statuses. | this folder |

**Not bugs (intentional or sequential-apply OK):**

- Migration `211` still mentions `started` / `dropped` on `guests.status`. `221` remaps and replaces the check. Empty-DB apply of `201` → `211` → `221` still ends on the correct catalog (`201` was already patched to the final values).
- Pipeline uniqueness is enforced in the service, not a DB unique `(guest_id, status)`. Fine for this UI; a unique index would be extra hardening only.
- Guest tables enable RLS with **no policies** (admin client only). Same pattern as other manager-only tables in this app.

---

## 4. Follow-up tasks

Do these in order. Check the box when done. Each task is independently shippable.

### P1 — keep CI green

#### T1. Fix manager nav “full catalog” test ✅

- Add `PERMISSIONS.GUESTS_VIEW` to the `allViews` set in `lib/auth/filter-panel-navigation.test.ts`.
- Re-run: `npx vitest run lib/auth/filter-panel-navigation.test.ts`.
- **Done when:** that file is 5/5 green and filtered href count matches `MANAGER_PANEL_NAVIGATION`.

### P2 — copy and mutation UX

#### T2. Fix create-guest default-status copy ✅

- In `components/manager/guests/add-guest-dialog.tsx`, change “Status starts as Started” → “Status starts as Scheduled”.
- **Done when:** the dialog matches `GUEST_DEFAULT_STATUS`.

#### T3. Guard staff-fill Sheet while submit is in flight ✅

- Wire `usePendingAwareOpenChange` to the wizard pending flag (not `false`).
- Pass `showCloseButton={!isPending}` on `SheetContent`.
- Keep the sheet open on error; close only on success (already closes via `onSuccess`).
- **Done when:** Escape / overlay / X / cannot dismiss during staff submit.

#### T4. Fail-close application hard-delete on storage errors ✅

- In `deleteGuestRegistrationApplicationForManager`, if `removeRegistrationStorageObjects` returns an error, return `{ success: false }` and **do not** delete the application row (same pattern as `deleteGuestForManager`).
- Add a unit test for the failure path.
- **Done when:** storage error blocks the DB delete.

### P3 — consistency and cleanup

#### T5. Align cancel-application lookup with delete ✅

- Resolve the target application the same way as delete: `invite.application_id` **or** active application for that `guest_id`.
- Add a test where invite `application_id` is null but an active app exists.
- **Done when:** cancel and delete find the same dossier the UI is showing.

#### T6. Clarify status history copy ✅

- In `guest-status-history.tsx`, state that the list is the **pipeline log**, not profile-status changes.
- **Done when:** staff can tell why a profile change does not appear here.

#### T7. Remove or wire unused guest temp-upload action ✅

- Either delete `tempUploadGuestRegistrationDocumentAction` if nothing imports it, **or** point the guest wizard at it if guest uploads must be isolated.
- Today `registration-documents-step.tsx` uses the shared `tempUploadRegistrationDocumentAction` — that path **does** work.
- **Done when:** no unused server action, or guest mode explicitly uses the guest action.

#### T8. Optional public `loading.tsx` ✅

- Add `app/(public)/register/guest/[token]/loading.tsx` using the shared route loading component, **only if** you want parity with panel routes. `/register` has none; skip if you prefer public pages without a segment fallback.

#### T9. Mark the old plan historical ✅

- At the top of `implementation-plan.md`, add a one-line banner: superseded by this file; do not implement from that plan.
- **Done when:** a reader cannot mistake the old catalogs for current product.

### Out of scope (do not do in these tasks)

- Auto-convert guests to users / students / enrollments.
- Derive profile status from the pipeline.
- Hard-delete invites from the UI.
- Unique phone / name constraints.

---

## 5. File map (for the tasks above)

| Area | Paths |
|------|--------|
| Migrations | `supabase/migrations/20260820120000_guests.sql`, `…211…status_current_pointer.sql`, `…221…profile_and_pipeline_statuses.sql` |
| Domain | `lib/constants/guest.ts`, `types/manager-guest.ts`, `lib/manager/guests/*` |
| Services | `services/guest.service.ts`, `services/guest-registration.service.ts` |
| Actions | `app/(panels)/manager/guests/actions.ts`, `app/(public)/register/guest/[token]/actions.ts` |
| UI | `components/manager/guests/*`, `components/public/registration/registration-wizard.tsx` |
| Authz | `lib/constants/permissions.ts`, `lib/constants/role-seed-permissions.ts`, `lib/auth/manager-route-permissions.ts`, `lib/constants/panel-nav.ts` |

---

## 6. Suggested execution order

1. **T1** (test) — unblocks CI.  
2. **T2** (copy) — one-line, high visibility.  
3. **T3** then **T4** — real mutation-safety.  
4. **T5–T7** — consistency / dead code.  
5. **T8–T9** — polish / docs.
