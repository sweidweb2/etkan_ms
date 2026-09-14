# [01] Slow page switching & top loading bar feeling “off”

**Where it shows up:** All role panels (CEO, manager, co-manager, admin, teacher, student) — not only CEO.  
**What people notice:** Moving between pages feels slow, and the thin bar at the top of the screen does not always match when the new page is actually ready.  
**Date noted:** 2026-08-07  

---

## In plain words — what is going wrong?

When you click a menu item, a button, or a card to go to another page, two things should feel smooth:

1. **The wait should be short** — the new section should appear without a long pause.
2. **The thin top bar** should feel honest — it should show while you wait, and finish when the new page is really ready to use.

Today, neither feels quite right.

### Feeling A — “Why is switching pages so slow?”

You click Workshops → Instructors → Schedules (or any other panel pages). The sidebar and header stay on screen, but the **main content** takes a noticeable moment to swap. Sometimes you see the spinning “Loading page…” in the middle. That wait is real work the app is doing on every click — checking who you are, what you’re allowed to see, then loading that page’s data — even when you only moved to a nearby page in the same panel.

This is **app-wide**. CEO was a useful example because those menu items jump across shared manager pages, but manager, teacher, student, and the other panels do the same kind of work on every move.

### Feeling B — “The top bar doesn’t match the wait”

The thin bar at the very top is working as built. The mismatch is about **what it watches** vs **what you care about**:

| What you expect | What happens today |
|-----------------|--------------------|
| Bar appears the moment I click | Bar waits a short beat (~50 ms) before showing (anti-flash); intentional navigations should feel acknowledged quickly |
| Bar stays until the new page is usable | Bar stays while RSC work is in flight **and** while panel/full-page route loading (“Loading page…”) is mounted |
| Bar feels the same from sidebar, cards, and buttons | Sidebar `Link` clicks arm on capture; `router.push` arms before `pushState`; panel search arms explicitly before navigate |

So people say: “the loader is correct, but I don’t know what’s wrong.” What’s wrong is the **gap between the bar and the real page-ready moment**, plus the **real delay** behind each click.

---

## Why this happens (simple picture)

Think of each page change as three separate clocks:

1. **Door check** — “Is this person allowed here?” (login session, role, permissions). Runs again on almost every click.
2. **Fetch the room** — load that page’s list, details, or report from the database.
3. **Show the room** — put the new content on screen (sometimes after a short “Loading page…” spinner).

The **top bar** mostly follows clock (1)+(2) for the network trip.  
**You** care about clock (3) — when the section is ready to read and click.

Those clocks don’t end at the same time. That’s why the bar can finish early, crawl for a while, or feel out of sync — even though the bar itself isn’t “broken.”

---

## What “fixed” should feel like

- Clicking between any panel pages feels **noticeably snappier**.
- While you wait, feedback is clear: top bar and/or page spinner, without looking stuck or lying.
- Top bar **starts soon after click** and **ends when the new content is ready** (or clearly hands off to the page spinner if something is still loading inside the page).
- Same good behavior from **sidebar**, **search**, **cards**, and **buttons** across **all** panels — not a one-panel patch.

---

## Fix plan — phases for the whole app

Do these in order. Each phase should leave the app usable. Don’t skip testing before moving on.

### Phase 0 — Confirm and measure (no big code changes yet)

**Goal:** Agree on the problem and get a simple before/after picture.

**Steps**

1. Pick 3–5 journeys that feel slow today, covering more than one role, for example:
   - CEO: Instructors → Schedules → Workshops → AI usage  
   - Manager: Dashboard → Students → Classes → Accounting  
   - Teacher or student: two or three of their main pages  
2. For each click, note by hand (or stopwatch):
   - Time until top bar appears  
   - Time until top bar finishes  
   - Time until the new content is usable (spinner gone, list visible)  
3. Write those numbers in a short “before” note at the bottom of this file or in a linked checklist.
4. Confirm with the team: we fix **all panels**, not only CEO.

**Done when:** Shared list of journeys + rough before timings.

---

### Phase 1 — Make the top bar feel honest

**Goal:** Align the loading bar with “I’m waiting for this page,” without waiting for deeper speed work.

**Steps**

1. Review the short delay before the bar shows — keep a tiny delay only if flash-on-fast-clicks is annoying; otherwise start sooner so clicks feel acknowledged.
2. Keep the bar up until the new route’s main content is ready (or until the page-level “Loading page…” is gone), not only until the first network reply.
3. Make sure **all** ways of changing pages start the same feedback: sidebar links, in-page buttons, cards, panel search, browser back/forward.
4. Keep the rule: no top bar for opening a modal, dropdown, or accordion that doesn’t load a new page.
5. Smoke-test every role panel once (CEO, manager, co-manager, admin, teacher, student).

**Done when:** On the Phase 0 journeys, bar start/end roughly matches when the section feels ready; no role left untested.

---

### Phase 2 — Stop repeating the same “who am I?” work on every click

**Goal:** Make moving between pages in the same panel cheaper — this is the main speed win for the whole app.

**Steps**

1. Treat “current user + role + display name + permissions + instructor flag” as **one shared pack** loaded once per request (or reused carefully), instead of asking the same questions many times while building the shell and the page.
2. Avoid redoing heavy shell work when only the **middle content** changed (sidebar/header already on screen).
3. Keep security the same: still block people who shouldn’t open a page — just don’t pay the full cost twice for no reason.
4. Re-check the same journeys from Phase 0; waits should drop even before pages themselves get faster.

**Done when:** Layout/shell work on a typical panel click is clearly lighter; timings improved on every role’s journeys.

---

### Phase 3 — Make each page’s own data load faster

**Goal:** After the shell is cheaper, shrink the wait for each section’s content.

**Steps**

1. Start with the heaviest / most-used pages (lists with lots of rows, detail pages, reports).
2. For each page: load only what’s needed for first paint; don’t wait on data the user doesn’t see yet.
3. Prefer parallel loads where the page today waits in a line for things that don’t depend on each other.
4. Add or keep a clear in-page loading state when a section still needs time — so users aren’t left with an empty area and a finished top bar.
5. Roll through panels in waves (manager/CEO shared pages first, then other roles), same quality bar each wave.

**Done when:** Heaviest pages on the journey list feel acceptably fast; no panel left with “known slow” pages unaddressed.

---

### Phase 4 — Polish and guardrails

**Goal:** Lock in the better feel so it doesn’t drift.

**Steps**

1. Re-run Phase 0 journeys; write “after” timings next to “before.”
2. Short regression checklist: navigate by sidebar, by button, by search, with browser back — top bar + page spinner behave as expected.
3. Note in team docs / cursor rules: top bar = global wait; page spinner = this section; don’t add a second top bar inside a panel.
4. If something is still slow, open a follow-up under `docs/[13] Problems/` for that page — don’t silently accept it.

**Done when:** Before/after noted, checklist green, conventions written down.

---

## Suggested order of work (checklist)

Use this as the day-to-day list:

- [ ] **Phase 0** — Journey list + before timings (multi-role)
- [x] **Phase 1** — Top bar timing & coverage (all entry points, all panels)
- [x] **Phase 2** — Shared session/permissions pack; less repeat work on each click
- [ ] **Phase 3** — Page-by-page data load improvements (waves across panels) — **Wave 1–3 done**; **Wave 4 sample:** instructor schedules calendar first paint scoped (first instructor); All/workshop deferred; leftover: borrow, logs, weekly templates, emailing, etc.
- [ ] **Phase 4** — After timings, regression checklist, docs/rules update

---

## Out of scope for this problem

- Redesigning panel menus or visual theme  
- Changing who is allowed to open which page (RBAC rules stay as they are; we only make checks cheaper / clearer)  
- Replacing the top bar with toasts for navigation  

---

## Before / after notes

| Journey | Role | Before (click → usable) | After | Notes |
|---------|------|-------------------------|-------|-------|
| Instructor schedules (sidebar) | Manager/CEO | ~4s (listAll) | page ~200ms; was still ~1.5–2s total | Remaining was **middleware `proxy.ts`** (~1–1.9s): `getUser` + maintenance + role DB |
| _e.g. Instructors → Workshops_ | CEO | _fill in_ | | |

**Phase 1 (2026-08-07):** Show delay 150→50 ms; `TopLoaderPendingBridge` holds the bar while panel/full-page route loading is mounted; `armGlobalTopLoaderNavigation` + arm-before-`pushState` for search/`router.push` parity with Link clicks.

**Phase 2 (2026-08-07):** `getSessionPack` (user + role + display name + instructor + permissions) request-scoped; session helpers project from it; `assertPermission` / `hasPermission*` use `getUserPermissionsCached`; `RolePanelLayout` + manager route gate consume the pack.

**Phase 3 Wave 1 (2026-08-07):** Income statement + analytics use date-scoped ledger queries (current year / selected period); accounting page paints phases first with Suspense for exception diagnostics; Auth emails batched via `listAuthEmailsByIds` on students/users/class roster.

**Phase 3 Wave 2 (2026-08-07):** Workshop detail soft-gates payments / schedule slots / instructor candidates and uses payment count instead of listing when unpaid; class detail defers available-students, transfer options, and subject/semester edit options to dialog open, Suspense for analytics; dashboard uses count/aggregate queries, today-only schedule, audit log limit 4.

**Phase 3 Wave 3 (2026-08-07):** Instructors page defers candidates + Auth email batch; schedule **details** uses paged queries + count stats (no listAll); calendar soft-gates workshop create tabs (still loads all weekday templates for “All schedules”); AI usage list omits prompt/response (load on details); workshop payments overview uses aggregates + server-paged rows.

**Phase 3 Wave 4 sample (2026-08-07):** Instructor schedules **calendar** first paint = instructors list + first instructor’s slots only (`listByRecord`); workshops soft-gated until Workshop browse / Add slot; filter changes load via `loadInstructorScheduleCalendarSessionsAction` (All excludes locked workshops in SQL).

**Middleware floor (2026-08-07):** Dev timings showed `proxy.ts` ~1–1.9s vs `application-code` ~200ms after calendar scoping. Middleware now: `getClaims()` (prefer over `getUser`), parallel maintenance fetch, 15s maintenance cache, JWT role when present (skip profiles.role round-trip).

---

## Related

- Top loader behavior rules: `.cursor/rules/loaders-panel-top.mdc`  
- Page / panel spinners: `.cursor/rules/loaders-full-page.mdc`, `.cursor/rules/loaders-route.mdc`  
- Actions / services speed (mutations): `docs/[13] Problems/[02] slow-actions-and-services.md`  
)
