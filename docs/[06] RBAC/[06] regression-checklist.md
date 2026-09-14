# RBAC — Final regression checklist

Manual QA after Phase 6+. Prerequisites: `npm run seed:rbac`, manager login with full grants.

Automated engine smoke (run first):

```bash
npm run smoke:authz
```

See also: [`[05] enforcement.md`](./[05]%20enforcement.md).

---

## A — Full manager (happy path)

### People

- [ ] **Users** — `/manager/users`: list, open detail, create staff user, edit user
- [ ] **Students** — `/manager/students`: list, detail, create, edit, change status if used
### Academics

- [ ] **Subjects** — `/manager/subjects`: list, detail, create, edit, delete (when allowed)
- [ ] **Classes** — `/manager/classes`: create/edit class, assign/unassign teacher, add student, remove student / transfer
- [ ] **Class deep path** — class → session → attendance → task → final exam → compute grade → export certificate / fast certificate
- [ ] **Semesters** — `/manager/semesters`: create/edit, add student, connect class
- [ ] **Equipment** — `/manager/equipments`: create/edit; `/manager/equipments/borrow`: borrow, edit, return

### Operations

- [ ] **Schedule** — `/manager/schedule`: create, edit, delete slot
- [ ] **Notifications** — `/manager/notifications`: create, edit, mark read, delete
- [ ] **Accounting** — `/manager/accounting`: page opens (view-only)

### Email

- [ ] **Emailing** — `/manager/emailing`: compose / send
- [ ] **Sent** — `/manager/sent`: open detail, resend

### System

- [ ] **Backup** — `/manager/backup`: export table / full, download / re-export
- [ ] **Logs** — `/manager/logs`: list opens
- [ ] **Permissions** — `/manager/rbac`: change a non-critical grant and save (then restore); open a user → Permissions to edit private allows
- [ ] **Settings** — `/manager/settings`: maintenance toggle, own credentials update

---

## B — Restricted user / role

Prepare: in Permissions, give a test role **only** e.g. `subjects.view` (+ `dashboard.view` if you want dashboard redirect). Log in as a user with that role (or temporarily strip manager and use a co-manager with those keys).

- [ ] Sidebar shows only allowed items (no flash of full nav)
- [ ] Mobile sheet matches desktop nav filter
- [ ] `/manager/subjects` works; `/manager/users` redirects or forbidden
- [ ] Direct URL to a denied page is blocked (layout route gate)
- [ ] Hidden write buttons stay gone after refresh (no DOM-only security)

---

## C — Revoke while using the app

As manager with `rbac.manage`:

1. Open a feature you can write (e.g. Subjects).
2. Permissions → remove `subjects.create` (keep `subjects.view`).
3. Soft-navigate or hard-refresh Subjects.

- [ ] **Add subject** button is hidden (`Can`)
- [ ] Forcing the create action still returns Unauthorized on the server
- [ ] Restore `subjects.create` when done

Repeat for one of: backup download, user create, grades export, settings maintenance.

---

## D — Hardening spots (wrong permission)

Without the matching write/export permission:

- [ ] `GET /api/manager/backup` → 403
- [ ] Maintenance save → Unauthorized
- [ ] Staff user create → Unauthorized
- [ ] Certificate / fast-certificate export → Unauthorized

---

## E — Cross-panel

- [ ] Teacher/student cannot open `/manager/users` (non-shared manager paths stay exclusive)
- [ ] Instructor (`is_instructor` + `workshops.view`) on teacher/co-manager/etc. sees Manage workshops and can open `/manager/workshops`
- [ ] Non-instructor with `workshops.view` does not see workshops nav; deep link to `/manager/workshops` redirects to their dashboard
- [ ] `/manager/workshops/payments` requires `workshops.payments.view`
- [ ] Login redirect and maintenance behavior unchanged
