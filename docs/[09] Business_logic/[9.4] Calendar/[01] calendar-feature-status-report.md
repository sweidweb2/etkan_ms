# [01] Calendar — feature status report

**Project:** Etkan MS  
**Date:** 2026-08-01  
**Scope:** Manager Weekly Schedule / Calendar v1 (date-specific slots, FullCalendar UX, copy last week, optimistic UI)  
**Verdict:** Core requirements for this phase are **implemented**. Optimistic UI hardening (pending-temp merge, temp guards, copy sync, type-filter visibility) is **included** in this delivery. Remaining items are **intentional limits** or **deferred polish**, not silent bugs on the happy path.

---

## How to read this report

Each section is a **task / capability**. For every task:

| Field | Meaning |
|-------|---------|
| **Status** | `Working` · `Working with caveats` · `Deferred` · `Out of scope` |
| **What works** | Confirmed behavior in code |
| **Caveats / risks** | Edge cases, intentional limits, or failure modes operators should know |
| **Proof** | Primary files |

---

## 0. Delivery snapshot

| Capability | Status |
|------------|--------|
| Schema (`slot_date`, color, unique name+date+time) | Done |
| Permissions (`schedule.view\|create\|update\|delete`) | Done |
| List + FullCalendar rendering | Done |
| Create / Edit / Delete | Done |
| Colors + type picker + type filter | Done |
| Drag move / resize | Done |
| Alt+duplicate | Done |
| Copy last week (preview + skip duplicates) | Done |
| Optimistic UI + hardening | Done |

**UI entry:** `/manager/schedule`  
**Domain lock:** Each DB row is **one calendar occurrence** (`slot_date`), not a repeating weekday template.

---

## Task 1 — Schema & data model

**Status:** Working

### What works
- Table `weekly_schedule_slots` is date-specific via `slot_date date NOT NULL`
- Unique constraint `(name, slot_date, start_time, end_time)` — duplicate identity skipped/blocked
- Slot `type`: `class | workshop | online | meeting`
- Slot `color`: pastel hex palette (`#BAE6FD`, `#A7F3D0`, `#DDD6FE`, `#FDE68A`, `#FECDD3`)
- `day_of_week` removed after backfill migration

### Caveats / risks
- Overlapping times with **different** names are allowed (only name+date+time uniqueness)
- Page loads **all** slots (not week-scoped); fine until volume grows

### Proof
- `supabase/migrations/20260803120000_weekly_schedule_slots_name_type.sql`
- `supabase/migrations/20260803130000_weekly_schedule_slots_slot_date.sql`
- `supabase/migrations/20260803140000_weekly_schedule_slots_color.sql`
- `supabase/migrations/20260803150000_weekly_schedule_slots_pastel_colors.sql`
- `docs/[06] Database/etkan-ms-schema-latest-dbdiagram.dbml`
- `types/manager-weekly-schedule.ts`

---

## Task 2 — Permissions & access

**Status:** Working

### What works

| Permission | Use |
|------------|-----|
| `schedule.view` | List / calendar page |
| `schedule.create` | Add slot, Alt-duplicate, Copy last week |
| `schedule.update` | Edit dialog, drag move, resize |
| `schedule.delete` | Delete confirm from edit footer |

- UI gated with `Can` / `hasPermissionInSet`
- Services enforce via `assertPermission` / `getUnauthorizedError`

### Caveats / risks
- Create-only users can drag for **duplicate** (Alt) but not persist moves
- Update-only users can move/resize but not create or copy

### Proof
- `lib/constants/permissions.ts`
- `docs/[11] RBAC/[02] permission-definitions.md`
- `services/schedule/weekly-schedule-slot.service.ts`
- `components/manager/schedule/manager-schedule-panel.tsx`

---

## Task 3 — List + FullCalendar rendering

**Status:** Working

### What works
- Server page loads sessions → `ManagerSchedulePanel`
- One-shot events from `slotDate` + start/end (no `daysOfWeek` recurrence)
- Week starts Sunday (`firstDay={0}`)
- Views: week / day / month / list
- Theme via Monarch + `fullcalendar-dark.css` (system CSS vars)
- Pastel fill + strong contrast text/border colors

### Caveats / risks
- Month multi-day select defaults to **start date** + 09:00–10:30
- Local timezone used for `YYYY-MM-DD` / `HH:mm` (single-timezone school assumption)

### Proof
- `app/manager/schedule/page.tsx`
- `lib/manager/weekly-schedule-calendar.ts`
- `components/manager/schedule/manager-schedule-panel.tsx`
- `components/manager/schedule/fullcalendar-dark.css`

---

## Task 4 — Create / Edit / Delete

**Status:** Working

### What works
- Add dialog (button or drag-select range)
- Edit dialog on event click (no separate details dialog)
- Delete confirm from edit footer trash icon
- Client Zod validation; server re-validates
- Unique conflicts map to a clear toast message

### Caveats / risks
- Dialogs close immediately on submit (optimistic); server field errors surface as toasts, not inline
- Temp (`__temp_…`) slots while saving cannot be edited/deleted/dragged (guarded)

### Proof
- `components/manager/schedule/add-weekly-schedule-slot-dialog.tsx`
- `components/manager/schedule/edit-weekly-schedule-slot-dialog.tsx`
- `app/manager/schedule/actions.ts`
- `lib/validators/manager/weekly-schedule-slot.ts`

---

## Task 5 — Colors, type picker, type filter

**Status:** Working

### What works
- Color swatches on create/edit
- Type toggle cards (class / workshop / online / meeting)
- Top filter tabs: All | Class | Workshop | Online | Meeting
- Creating a slot while a **different** type filter is active switches the filter to the new type so the event stays visible

### Caveats / risks
- Filter is client-only; does not change server fetch

### Proof
- `components/manager/schedule/schedule-slot-color-picker.tsx`
- `components/manager/schedule/schedule-slot-type-picker.tsx`
- `lib/validators/manager/weekly-schedule-slot.ts` (`WEEKLY_SCHEDULE_SLOT_COLOR_*`)

---

## Task 6 — Drag move / resize

**Status:** Working with caveats

### What works
- Plain drag moves date/time and persists via update action
- Resize top/bottom edge updates duration
- Failure reverts FullCalendar dates + local session state + error toast
- Optimistic local `sessions` update first

### Caveats / risks
- Requires `schedule.update`
- End-before-start rejected client-side before network

### Proof
- `components/manager/schedule/manager-schedule-panel.tsx` (`handleEventDrop`, `handleEventResize`)
- `services/schedule/weekly-schedule-slot.service.ts` (`updateWeeklyScheduleSlotForManager`)

---

## Task 7 — Alt+duplicate

**Status:** Working

### What works
- Hold Alt while dragging → ghost keeps original visible; drop creates a copy at target
- Press/release Alt mid-drag toggles duplicate vs move intent
- Uses create permission + create action (same optimistic create path)

### Caveats / risks
- Releasing Alt before drop turns the gesture into a **move** (if update allowed)
- Duplicate onto same name+date+time hits unique constraint → toast + rollback

### Proof
- `components/manager/schedule/manager-schedule-panel.tsx` (ghost helpers, `handleEventDrop`)

---

## Task 8 — Copy last week

**Status:** Working

### What works
- “Copy last week” opens preview for the calendar’s current Sunday week
- Preview lists **will create** vs **will skip** (same name + date + times already present)
- Confirm bulk-creates; skips duplicates server-side (preview rebuilt on execute)
- Optimistic temps shown immediately; on success pending temps cleared then soft refresh loads real ids

### Caveats / risks
- Preview vs execute can differ if another actor mutated the week between open and confirm; UI reconciles via refresh after success
- Empty last week / everything already present → success message, nothing created

### Proof
- `components/manager/schedule/copy-last-week-schedule-dialog.tsx`
- `services/schedule/weekly-schedule-slot.service.ts` (`previewCopyLastWeekScheduleForManager`, `copyLastWeekScheduleForManager`)
- `app/manager/schedule/actions.ts`

---

## Task 9 — Optimistic UI

**Status:** Working

### What works
- Local `sessions` state drives the calendar; UI updates before DB round-trip
- Create / edit / delete / move / resize / Alt-dup / copy all optimistic with rollback on failure
- Success toasts via `@/lib/toast`
- **Hardening:**
  - `pendingTempIdsRef` — soft refresh merges server rows **without** wiping in-flight temps
  - Temp ids blocked from edit / delete / drag; FullCalendar marks them non-editable
  - Copy success clears those temps from pending, then soft refresh so skipped rows disappear correctly
  - Type filter auto-switches when a create would otherwise be hidden

### Caveats / risks
- Concurrent multi-tab edits are last-write-wins (no realtime sync)
- Soft refresh after copy still depends on `router.refresh()` returning updated RSC props

### Proof
- `components/manager/schedule/manager-schedule-panel.tsx`
- `lib/manager/weekly-schedule-calendar.ts` (`isTempScheduleId`, non-editable temp events)

---

## Follow-up checklist (this delivery)

| Item | Status |
|------|--------|
| Soft-refresh must not wipe in-flight `__temp_` creates | Done |
| Block edit / delete / drag on temp slots | Done |
| Copy success clears pending temps then soft refresh | Done |
| Type filter switches so new create stays visible | Done |

---

## Manual smoke

1. Create slot → appears immediately → hard refresh → still there  
2. Edit / delete → optimistic update; force unique conflict → toast + rollback  
3. Move / resize / Alt-duplicate  
4. Copy last week with some overlaps → after success only real rows remain  
5. Create Workshop while filter is Class → filter switches to Workshop, slot visible  
6. Create then immediately Copy (refresh path) → in-flight create temp not wiped  
7. Click/drag a slot still showing while save is in flight (temp) → blocked  

---

## Out of scope (this phase)

- Teacher / student schedule panels parity with manager UX  
- Realtime multi-user collaboration  
- Week-scoped server fetch / pagination  
- Recurring rules beyond “copy last week”  
- Print / export calendar  
