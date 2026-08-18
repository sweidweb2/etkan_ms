# [9.8] Guest feature audit

**Project:** Etkan MS  
**Date:** 2026-08-19  
**Scan type:** Code + unit tests (not a live browser pass)  
**Scope:** Guest CRUD, profile vs pipeline statuses, registration invite/dossier, connect user, create student from registration, permissions, and edge cases.

Standalone snapshot of the current code. Not a follow-up task list and not a replacement for other files in this folder.

**Verdict:** The guest feature’s **main path works**. Create → status → invite → fill form → create student / connect user is coherent. What is left is mostly edge cases, partial-failure, and a few product inconsistencies — not a broken CRUD loop.

---

## What is working

### Intake CRUD

- Create with `full_name`, `phone`, `age`, school, education, interested service, notes. Default profile is **scheduled**; optional switch to **pending**.
- List: search, profile-status filter, service filter, pagination, detail link.
- Edit intake from the detail page.
- Hard-delete is fail-closed: storage files are removed first; if that fails, the guest row stays.
- Cascade cleans events, invite, and applications.
- Toasts and `guest_deleted` after redirect.

### Profile vs pipeline

Two separate layers, and the code matches that:

| Layer | Where | Rules |
|---|---|---|
| Profile | `guests.status` | `scheduled \| pending \| cancelled \| rejected \| finished`. Staff can set any → any. |
| Pipeline | `guest_status_events` | Record only while **pending**. Remove while pending or finished. Removing a step from a **finished** guest reopens profile to **pending**. Recording pipeline **finished** (from the stepper) also sets profile finished. |

Duplicates are a no-op. History is the pipeline log only (copy already says profile changes are not listed).

### Registration

- One invite per guest; one non-cancelled application per guest (DB unique index).
- Open / rotate / stop / reopen.
- Public `/register/guest/[token]` is one-shot (invalid / stopped / used).
- Staff fill in a sheet; submit marks invite used.
- Second active form is blocked until cancel or hard-delete.
- Cancel and delete both resolve `invite.application_id` **or** the active app.
- Application hard-delete fail-closes on storage errors.
- Staff-fill sheet is pending-aware (cannot dismiss mid-submit).

### Create student (handled, and independent of guest status)

Shows when there is a **filled, non-cancelled** form **and** it is **not already linked**. Pending / finished / scheduled / etc. does not hide the button.

On submit it:

1. Creates the student (`createStudent`, password optional → `"password"`).
2. Sets `application.user_id` to that new user.
3. Records pipeline **Routed correctly**, **Finishing routing doc**, **Finished** (without auto-finishing the profile).
4. If **Mark guest as finished** is on, sets `guests.status` to finished.

If already linked, the button is hidden and the service rejects a second create.

### Connect to user (independent)

Shows whenever there is an active registration, any guest profile status. Linking no longer requires finished. Create student and connect are both tied to the **form**, not to guest status.

---

## What is broken or incomplete

These are real, but none of them block the happy path.

### 1. Partial failure after student create (real)

Student create is not one DB transaction with link + pipeline.

If Auth/student succeeds and then:

- **link fails** → error: “Student was created, but the registration could not be linked.” Create student **still shows** (no `user_id`). Retry usually fails on **duplicate email**. Workaround: **Connect to user** and pick the account that was just created.
- **pipeline/profile fails** → student exists and is linked; Create student is hidden. Pipeline must be recorded by hand.

### 2. Registration application status never moves

Creating or connecting a student does **not** set application status to `applied` / `accepted`. The dossier can stay `pending` forever while a student account exists. Review statuses are still a separate manager-registrations action.

### 3. Connect can attach *any* user, not only students

`listUsersForGuestRegistrationLink` lists **all profiles**. You can connect a manager/teacher/etc. Create student always creates a real student; connect does not.

### 4. Stepper copy is slightly stale

Finished still says the system does not auto-create users/students. That is still true (finished itself does not convert). Create student on the same page **is** manual conversion, so the copy can confuse staff.

### 5. Connect does not revalidate lists

`connectGuestRegistrationUserAction` updates local UI state but does not `revalidatePath` the guest detail or registrations inbox. The details page looks right until you leave; the registrations list can be stale until the next navigation.

### 6. CEO cannot Create student

By design: `guests.create_student` is manager-only, and CEO also lacks `students.create`. CEO **can** still open invites, fill, cancel/delete, and **Connect to user**.

### 7. Default password is the literal `"password"`

Intentional for now. Weak, not emailed (`notifyStudentCreated` is still a no-op).

---

## Edge cases that *are* handled

- No form / cancelled form → no Create student, no Connect.
- Already linked → Create student hidden + service error.
- Duplicate username/email on create → field errors, dialog stays open.
- One user cannot be on two **active** applications (unique index).
- One guest cannot have two **non-cancelled** applications.
- Scheduled guest + Create student → profile is moved to **pending** first, then the 3 pipeline steps.
- Already finished guest + Create student → skip pipeline adds (cannot record while finished); toggle is a no-op if already finished.
- Duplicate pipeline nodes are skipped.
- Public submit after used/stopped invite is rejected; if marking invite used fails, the new application row is deleted (rollback).

---

## Edge cases *not* fully handled (product gaps)

| Case | What happens today |
|---|---|
| **Cancelled / rejected guest + Create student** | Student is still created and linked. Pipeline is **skipped** (schema locked). Toggle can still set profile to **finished**, so a cancelled guest can become finished as a side effect. |
| **Pipeline “finished” vs profile pending** | Toggle off → pipeline shows Finished, profile can stay Pending. Confusing, but what was asked for. Clicking that pipeline node later **removes** it (and if profile were finished, would reopen to pending). |
| **Hard-delete application after student exists** | Dossier is gone; **student account remains**. Guest can get a new invite/form. Old student is not deleted or unlinked in Auth. |
| **Cancel after linked** | App becomes cancelled (`user_id` kept). Unique index then allows that user on a **new** application. |
| **Open invite on cancelled/rejected guest** | Allowed. Public token also does **not** check guest profile status, so a cancelled guest with a live invite can still submit. |
| **Staff fill requires an invite** | No invite → “Open a registration invite before filling.” You cannot staff-fill from intake alone. |
| **No unique phone/name** | Duplicate guests are allowed (out of scope). |
| **No enrollment** | Create student does **not** add class, semester, or payments. |
| **Race: two tabs Create student** | First wins the link; second hits already-linked or duplicate email. No extra locking. |
| **Create student needs two permissions** | UI is `guests.create_student`; `createStudent` also checks `students.create`. Manager has both. A custom role with only the new key would fail mid-flow. |
| **Guest delete after student created** | Guest + dossier go away; student user stays. No reverse link on `student_profiles`. |

---

## Authz (working)

| Key | Who | Used for |
|---|---|---|
| `guests.view` | Manager + CEO | List/detail |
| `guests.create / update / delete` | Manager + CEO | CRUD |
| `guests.change_status` | Manager + CEO | Profile + pipeline |
| `guests.registration.manage` | Manager + CEO | Invite, staff fill, cancel/delete, connect |
| `guests.create_student` | **Manager only** | Create student from form |

Re-run `npm run seed:rbac` if the manager DB role was seeded before this key existed.

---

## Older bug list (already fixed in code)

- Nav test includes `guests.view`
- Create-guest copy is Scheduled, not Started
- Staff-fill sheet is pending-aware
- Application delete fail-closes on storage errors
- Cancel uses the same application lookup as delete
- History copy is clear

---

## Bottom line

CRUD, statuses, invite/form, Create student, and Connect are implemented and wired. The flow (form exists → create student + 3 pipeline steps + optional mark finished + link user; hide create if already mapped; connect anytime a form exists) **is handled**.

The remaining risk is not “button missing”; it is **orphans and half-success**: student created but not linked, student left behind after dossier delete, cancelled guests still convertible, and application review status never flipping to applied.
