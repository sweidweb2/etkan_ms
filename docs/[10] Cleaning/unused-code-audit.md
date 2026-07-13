# Unused code audit

**Date:** 2026-07-13  
**Last updated:** 2026-07-13 (groups A–D completed)  
**Scope:** Project-wide unused components, functions, and dummy/mocks.  
**Excluded from cleanup tasks:** analytics / reports / notifications pages and their dedicated mocks (per request).  
**Method:** Import-path and export-name searches across `*.ts` / `*.tsx` (docs-only mentions count as unused).

---

## Progress

| Group | Status |
|-------|--------|
| A — Unused mock files | Done |
| B — Dead class-list preview chain | Done |
| C — Dead equipment preview chain | Done |
| D — Orphaned preview helpers + stats mock | Done |
| E — Unused components | Pending |
| F — Unused exports / helpers | Pending |
| G — Deferred (still live) | Do not delete yet |

**Deleted so far:** 4 standalone mocks + class-list chain (4) + equipment chain (4) + orphaned previews/stats (9) = **21 files**.

---

## Summary

Unused / dead code **was found** outside the excluded areas. Groups **A–D are complete**. Remaining work is groups **E–F** (components + unused exports).

**Out of scope (do not treat as tasks here):**
- `manager-analytics-mock.ts`, `manager-reports-mock.ts`, `manager-notifications-mock.ts`
- Anything only consumed by `components/manager/analytics|reports|notifications`

**Still live mocks (do not delete yet — see G):**
- `manager-classes-mock.ts` → `student-joined-classes-section.tsx`
- `manager-users-mock.ts` + `get-manager-user-preview.ts` → `user-details-panel.tsx`
- `manager-student-borrow-equipment-mock.ts` + `get-manager-student-borrow-equipment-preview.ts` → `student-borrowed-equipment-section.tsx`
- Accounting-analysis still uses phases/students/account/scheduled-payments/semester mocks via `get-manager-accounting-analytics-preview.ts`

**Kept preview helpers (intentionally):**
- `lib/manager/get-manager-user-preview.ts`
- `lib/manager/get-manager-student-borrow-equipment-preview.ts`
- `lib/manager/get-manager-accounting-analytics-preview.ts`

---

## Task group A — Delete unused mock files (zero importers) ✅

- [x] **A1.** Delete `lib/constants/manager-audit-logs-mock.ts`
- [x] **A2.** Delete `lib/constants/manager-weekly-schedule-mock.ts`
- [x] **A3.** Delete `lib/constants/manager-class-analytics-mock.ts`
- [x] **A4.** Delete `lib/constants/manager-subject-classes-mock.ts`

---

## Task group B — Delete dead class-list preview chain ✅

- [x] **B1.** Delete `lib/constants/manager-classes-list-mock.ts`
- [x] **B2.** Delete `lib/constants/manager-semester-classes-mock.ts`
- [x] **B3.** Delete `lib/constants/manager-subject-sessions-preview.ts`
- [x] **B4.** Delete `lib/manager/get-manager-class-preview.ts`

---

## Task group C — Delete dead equipment preview chain ✅

- [x] **C1.** Delete `lib/constants/manager-equipments-mock.ts`
- [x] **C2.** Delete `lib/manager/get-manager-equipment-preview.ts`
- [x] **C3.** Delete `lib/manager/get-equipment-borrowed-quantity-preview.ts`
- [x] **C4.** Delete `lib/manager/get-manager-all-borrow-equipment-preview.ts`

---

## Task group D — Delete orphaned preview helpers + stats mock ✅

- [x] **D1.** Delete `lib/manager/get-manager-subject-preview.ts`
- [x] **D2.** Delete `lib/manager/get-manager-student-preview.ts`
- [x] **D3.** Delete `lib/manager/get-manager-semester-preview.ts`
- [x] **D4.** Delete `lib/manager/get-manager-semester-students-preview.ts`
- [x] **D5.** Delete `lib/manager/get-manager-student-stats-preview.ts`
- [x] **D6.** Delete `lib/constants/manager-student-stats-mock.ts`
- [x] **D7.** Delete `lib/manager/get-manager-student-classes-preview.ts`
- [x] **D8.** Delete `lib/manager/get-manager-student-account-preview.ts`
- [x] **D9.** Delete `lib/manager/get-manager-accounting-students-preview.ts`

---

## Task group E — Delete unused components (pending)

- [ ] **E1.** Delete `components/auth/sign-out-button.tsx` (`SignOutButton`)  
  Logout is handled in `components/panels/panel-user-menu.tsx`.

- [ ] **E2.** Delete `components/animate-ui/components/animate/tabs.tsx`  
  Call sites import `@/components/animate-ui/primitives/animate/tabs` instead. Remove empty parent folders if left empty.

---

## Task group F — Remove unused exports / helpers (pending)

- [ ] **F1.** Remove unused `PanelTopLoader` alias from `components/loaders/route-top-loader.tsx`  
  App mounts `RouteTopLoader` only.

- [ ] **F2.** Delete `lib/utils/password.ts` (`hashPassword`) — zero importers.

- [ ] **F3.** Remove unused `MANAGER_CLASS_STATUS_DOT_CLASSES` from `lib/constants/manager-class-display.ts`.

- [ ] **F4.** Remove unused `MANAGER_STUDENT_TASK_SLOTS_MAX_VISIBLE` from `lib/constants/manager-student-class-slots.ts`  
  (keep other slot constants that are used).

- [ ] **F5.** Remove unused `getSessionProgressTone` and `getSegmentProgressTone` from `lib/constants/manager-semester-class-progress.ts`.

- [ ] **F6.** Remove unused `isPaymentInCurrentMonthWindow` and deprecated `getAccountingPaymentAlert` from `lib/constants/manager-accounting-payment-alert.ts`  
  (`resolveManageAccountingAlert` is the live path).

- [ ] **F7.** Remove deprecated flat nav exports from `lib/constants/panel-nav.ts` if nothing still needs them:  
  `ADMIN_PANEL_NAV`, `MANAGER_PANEL_NAV`, `CEO_PANEL_NAV`, `TEACHER_PANEL_NAV`, `STUDENT_PANEL_NAV`  
  (keep `*_PANEL_NAVIGATION`).

---

## Task group G — Deferred (still used outside excluded pages)

Do **not** delete until the feature is wired to real data:

| Item | Still used by |
|------|----------------|
| `manager-classes-mock.ts` | Student assign-class UI |
| `manager-users-mock.ts` / `getManagerUserPreview` | User details panel |
| `manager-student-borrow-equipment-mock.ts` / borrow preview | Student borrowed equipment section |
| Phases / students / account / scheduled-payments / semester mocks | Accounting analysis via analytics preview helper |

---

## Excluded areas (no tasks in this doc)

| Item | Note |
|------|------|
| `manager-analytics-mock.ts` | Analytics (+ some accounting chart colors/period options) |
| `manager-reports-mock.ts` | Reports panel |
| `manager-notifications-mock.ts` | Excluded by request (also currently zero imports) |
| `manager-relationships-mock.ts` | Reports only |
| `manager-subjects-mock.ts` | Reports only (subject preview helper already deleted in D1) |
| `manager-student-classes-mock.ts` | Reports only (classes preview helper already deleted in D7) |
| `manager-student-class-detail-mock.ts` + `get-manager-student-class-detail-preview.ts` | Reports only |

---

## Verification checklist

- [x] Groups A mocks gone (`manager-audit-logs-mock|manager-weekly-schedule-mock|manager-class-analytics-mock|manager-subject-classes-mock`)
- [x] Groups B–D preview helpers gone (`get-manager-class-preview|get-manager-equipment-preview|get-manager-all-borrow|get-manager-subject-preview|get-manager-student-preview|get-manager-semester-preview|get-manager-semester-students|get-manager-student-stats|get-manager-student-classes-preview|get-manager-student-account-preview|get-manager-accounting-students`)
- [ ] After E: `rg "SignOutButton|sign-out-button" --glob "*.{ts,tsx}"` → empty
- [ ] After E–F: app still builds / manager pages load (users, students, classes, accounting analysis, schedule, logs)
