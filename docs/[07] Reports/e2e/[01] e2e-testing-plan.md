# Etkan MS — E2E testing plan (full application)

**Goal:** Add Playwright end-to-end (browser) tests for the **entire** Etkan MS surface — public site, auth, and every role portal — phase by phase, without rewriting product features.  
**Stack:** **Playwright** (Next.js App Router + TypeScript).  
**Date:** 2026-10-24 (rewritten against current `app/` + `lib/constants/routes.ts` + `panel-nav.ts`)  
**Folder:** `docs/[07] Reports/e2e/`  
**Inventory source of truth:** Section **8** (route tables). When you ship a new page, add it there and pick a phase.

---

## 0. Verdict / how to use this plan

| Rule | Meaning |
|------|---------|
| **E2E is additive** | Do not change business rules “to make tests pass.” Fix tests or add sparse `data-testid` only when needed. |
| **Unit tests stay primary** | Keep `npm test` (Vitest) for validators/services. E2E covers browser + auth + navigation + critical mutations. |
| **One phase at a time** | Finish a phase (green locally) before starting the next suite. |
| **Cover the whole app eventually** | Manager is largest, but public + teacher + student + admin/CEO/CRM/supervisor/co-manager are in scope. |
| **Inventory-driven** | Every `page.tsx` route appears in §8. Implementation = tick coverage column, do not invent parallel lists. |
| **No big-bang rewrite** | Never “add E2E by refactoring half the app.” |

**Related existing QA (keep using):**

- `docs/[06] RBAC/[06] regression-checklist.md` — manual RBAC QA (automate samples in Phase 14)
- `npm run smoke:authz` — authorization smoke (engine-level; not a UI replacement)
- `npm test` — Vitest unit/service tests (must stay green every phase)

---

## 1. What E2E is (simple words)

**Unit test:** “Does this function return the right answer?” (fast, no browser)  
**E2E test:** “Can a real user open the site, log in, click Add student, see success?” (slower, real browser)

E2E is for **journeys that break when layers disagree** (middleware + page + action + toast + RBAC).

Do **not** E2E every validator edge case — Vitest already covers most of that.

---

## 2. What you have today

| Layer | Status |
|-------|--------|
| Vitest unit/service tests | Strong (keep growing) |
| Playwright / Cypress | ✅ Phases **0–2** done (auth + public smoke); Phases 3–15 not started |
| CI for E2E | None yet |
| Seed scripts | `seed`, `seed:admin`, `seed:manager`, `seed:demo`, `seed:rbac`, etc. |
| Auth | Supabase email/password + cookies |
| Public site | Home, about, careers (+ roadmap), projects, gallery, blogs, life, register, guest register, financial invite `/f/[token]`, maintenance |
| Manager panel | Full product surface (people → academics → equipment → instructors/workshops → finance → email → content → system) |
| Teacher panel | Classes, class detail, tasks, settings (+ optional Manage workshops) |
| Student panel | Profile, classes, tasks, payments, borrowings (+ optional Manage workshops) |
| Other staff roots | `/admin`, `/co-manager`, `/ceo`, `/supervisor`, `/crm` — thin roots; most work happens on shared `/manager/*` routes filtered by RBAC/nav |

**Roles in app** (`lib/constants/roles.ts`):

`admin` · `manager` · `co-manager` · `ceo` · `supervisor` · `crm` · `teacher` · `student`

**Post-login homes** (`getDashboardRouteForRole`):

| Role | Lands on |
|------|----------|
| admin | `/admin` |
| manager | `/manager/students` |
| co-manager | `/co-manager` |
| ceo | `/manager/instructors` |
| supervisor | `/manager/students` |
| crm | `/manager/guests` |
| teacher | `/teacher/classes` |
| student | `/student` |

---

## 3. Tooling choice: Playwright

**Use Playwright**, not Cypress:

- Next.js / App Router friendly  
- Auth `storageState` per role  
- Trace/video on failure  
- Easy `npx playwright test` + GitHub Action later  

**Out of scope for v1:** visual screenshot regression, mobile device farms, load testing.

---

## 4. Safety rules while implementing E2E (do not break features)

### Must follow every phase

1. **No product behavior changes** unless a test reveals a real bug — then fix in a normal PR.  
2. **Prefer role/label/text** (`getByRole`, `getByLabel`). Add `data-testid` sparingly.  
3. **Never weaken auth/RBAC** for tests (no `if (NODE_ENV === "test")` permission skips).  
4. **Dedicated test users / test DB** — never destructive E2E against production.  
5. **Idempotent seeds** — unique names (`e2e_${Date.now()}_…`).  
6. **Gate CI:** fail PR only after Phase 0–3 are stable; until then local / optional job.  
7. **Keep Vitest green** — every E2E PR also runs `npm test` + `typecheck` + `lint`.  
8. **One domain suite per PR when possible.**  
9. **Flaky policy:** quarantine or fix; do not merge blind retries.  
10. **Align with UI patterns:** Sonner via `@/lib/toast`, form dialogs (`usePendingAwareOpenChange`), do not assert top loader as business truth.

### Allowed “test support” changes

| Allowed | Not allowed |
|---------|-------------|
| `data-testid` on stable controls | Change Zod rules to pass tests |
| Env vars for E2E accounts | Bypass middleware in test builds |
| Seed / cleanup under `scripts/e2e/` | Disable RLS/RBAC in app code |
| Playwright config, fixtures, helpers | Rewrite pages only “for testability” |
| Document skips for unfinished pages | Fake “pass” on empty shells without `@wip` |

---

## 5. Target folder layout (create gradually)

```text
e2e/
  playwright.config.ts            # or root playwright.config.ts
  fixtures/
    auth.ts                       # loginAs(role) + storageState per role
    db.ts                         # optional seed/cleanup
  helpers/
    forms.ts
    navigation.ts
    expect-toast.ts
  auth/
    login.spec.ts
    logout.spec.ts
    redirect-by-role.spec.ts
  public/
    marketing.spec.ts             # home, about, careers, projects, gallery, blogs, life
    register.spec.ts
    invite-forms.spec.ts          # /register/guest/[token], /f/[token]
  manager/
    smoke-nav.spec.ts             # all list/root routes
    users.spec.ts
    students.spec.ts
    registrations.spec.ts
    guests.spec.ts
    subjects.spec.ts
    semesters.spec.ts
    classes.spec.ts
    class-deep.spec.ts            # grades / sessions / tasks / categories
    equipments.spec.ts
    instructors.spec.ts
    instructor-schedules.spec.ts
    workshops.spec.ts
    accounting.spec.ts
    income-statement.spec.ts
    academic-analysis.spec.ts
    emailing.spec.ts
    content.spec.ts               # gallery, projects, blogs
    notifications.spec.ts
    system.spec.ts                # backup, logs, rbac, settings, cron-jobs, AI usage
  teacher/
    smoke-nav.spec.ts
    classes.spec.ts
  student/
    smoke-nav.spec.ts
    classes.spec.ts
    payments.spec.ts
    borrowings.spec.ts
  portals/
    admin.spec.ts
    co-manager.spec.ts
    ceo.spec.ts
    supervisor.spec.ts
    crm.spec.ts
  rbac/
    route-gates.spec.ts
    nav-visibility.spec.ts
```

**npm scripts (add in Phase 0):**

```bash
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright --ui
npm run test:e2e:headed   # headed browser
npm run test:e2e:smoke    # grep @smoke
```

**Env (never commit passwords):**

```bash
E2E_BASE_URL=http://127.0.0.1:3000
E2E_SKIP_WEBSERVER=1              # set when Next already runs (Docker or manual)
E2E_MANAGER_EMAIL=...
E2E_MANAGER_PASSWORD=...
E2E_TEACHER_EMAIL=...
E2E_TEACHER_PASSWORD=...
E2E_STUDENT_EMAIL=...
E2E_STUDENT_PASSWORD=...
E2E_ADMIN_EMAIL=...
E2E_CEO_EMAIL=...
E2E_CRM_EMAIL=...
E2E_SUPERVISOR_EMAIL=...
E2E_CO_MANAGER_EMAIL=...
E2E_RESTRICTED_EMAIL=...          # manager-like user with reduced grants
E2E_ALLOW_EMAIL=0                 # set 1 only with Mailtrap
E2E_ALLOW_MONEY=0                 # set 1 for @money writes
```

**Docker:** Playwright runs on the **host** by default and hits `:3000` whether Next is `npm run dev` or `etkan-local-web`. Local Supabase stays in Docker (`npx supabase start`). See `[03] local-setup.md`.

---

## 6. Test data strategy

| Approach | When |
|----------|------|
| **Seeded fixed accounts** | Login, nav smoke, read-only pages (one account per role above) |
| **Create-then-assert** | Users/students/subjects/classes — unique names |
| **Cleanup after** (best effort) | UI delete when safe, else weekly `scripts/e2e/` cleanup |
| **Shared demo seed** | Class/grades/accounting journeys (`npm run seed:demo`) |
| **Invite tokens** | Seed guest registration + financial form tokens for Phase 2 invite specs |

**Rule:** Prefer unique data over editing the same demo row (parallel-safe).

---

## 7. What “done” means for each phase

A phase is **done** when:

- [ ] Specs for that phase pass locally against a known env  
- [ ] No production code changes except allowed test hooks  
- [ ] `npm test` + `typecheck` + `lint` still green  
- [ ] `[02] phase-checklist.md` updated  
- [ ] Matching rows in §8 coverage tables marked  
- [ ] Flakes documented or fixed  

---

## 8. Application surface inventory (current app)

Coverage columns: leave blank until implemented. Use `S` = smoke (loads), `M` = mutation journey, `G` = RBAC gate sample.

### 8.1 Public site

| Route | Page | Coverage |
|-------|------|----------|
| `/` | Home | ✅ S (Phase 0–2) |
| `/about` | About | ✅ S (Phase 2) |
| `/careers` | Careers | ✅ S (Phase 2) |
| `/careers/roadmap/[id]` | Careers roadmap detail | ✅ S (Phase 2) |
| `/projects` | Public projects | ✅ S (Phase 2) |
| `/gallery` | Public gallery | ✅ S (Phase 2) |
| `/blogs` | Blogs list | ✅ S (Phase 2) |
| `/blogs/[slug]` | Blog detail | ✅ S (Phase 2; skips if no posts) |
| `/life` | Life list | ✅ S (Phase 2; unauth → login) |
| `/life/[id]` | Life detail | ✅ S (Phase 2; unauth → login) |
| `/register` | Public registration | ✅ S (Phase 2; submit gated) |
| `/register/guest/[token]` | Guest registration (no site chrome) | ✅ S invalid; seeded optional (`E2E_GUEST_TOKEN`) |
| `/f/[token]` | Financial form invite (no site chrome) | ✅ S invalid; seeded optional (`E2E_FINANCIAL_TOKEN`) |
| `/maintenance` | Maintenance page | ✅ S (Phase 2) |
| `/auth/login` | Login | ✅ S (Phase 1–2) |
| `/auth/signup` | Signup (if `PUBLIC_SIGNUP_ENABLED`) | ✅ S (Phase 2; disabled → redirects away) |
| `/auth/callback` | OAuth/email callback (usually no direct E2E) | — skip |

### 8.2 Auth journeys (cross-cutting)

| Journey | Coverage |
|---------|----------|
| Valid login → role home redirect | ✅ S (Phase 1) |
| Invalid password → error, stay on login | ✅ S (Phase 1) |
| Logout → public/login | ✅ S (Phase 1) |
| Unauthenticated access to panel → login redirect | ✅ S (Phase 1) |
| Authenticated guest-only routes → panel redirect | ✅ S (Phase 1) |

### 8.3 Manager panel — list / root routes

| Route | Nav group | Coverage |
|-------|-----------|----------|
| `/manager` | Root | |
| `/manager/users` | People | |
| `/manager/students` | People | |
| `/manager/registrations` | People | |
| `/manager/guests` | People | |
| `/manager/subjects` | Academics | |
| `/manager/subjects/catalog` | Academics | |
| `/manager/classes` | Academics | |
| `/manager/semesters` | Academics (“Manage teams”) | |
| `/manager/equipments` | Resources | |
| `/manager/instructors` | Instructors & workshops | |
| `/manager/instructor-schedules` | Instructors & workshops | |
| `/manager/instructor-schedules/details` | Instructors & workshops | |
| `/manager/workshops` | Instructors & workshops | |
| `/manager/workshops/payments` | Workshops | |
| `/manager/cloudflare-ai-usage` | Instructors & workshops | |
| `/manager/accounting` | Operations | |
| `/manager/income-statement` | Operations | |
| `/manager/income-statement/analytics` | Operations | |
| `/manager/income-statement/history` | Operations | |
| `/manager/academic-analysis` | Operations | |
| `/manager/emailing` | Email | |
| `/manager/emailing/compose` | Email | |
| `/manager/sent` | Email | |
| `/manager/gallery` | Options | |
| `/manager/projects` | Options | |
| `/manager/blogs` | Options | |
| `/manager/notifications` | System | |
| `/manager/backup` | System | |
| `/manager/logs` | System | |
| `/manager/rbac` | System | |
| `/manager/settings` | System | |
| `/manager/cron-jobs` | System (page exists; may be off-nav) | |

### 8.4 Manager panel — detail / deep routes

| Route | Coverage |
|-------|----------|
| `/manager/users/[id]` | |
| `/manager/students/[id]` | |
| `/manager/registrations/[id]` | |
| `/manager/guests/[id]` | |
| `/manager/subjects/[id]` | |
| `/manager/semesters/[id]` | |
| `/manager/classes/[id]` | |
| `/manager/classes/[id]/categories` | |
| `/manager/classes/[id]/grades` | |
| `/manager/classes/[id]/grades/students/[studentId]` | |
| `/manager/classes/[id]/sessions/[sessionId]` | |
| `/manager/classes/[id]/tasks/[taskId]` | |
| `/manager/classes/[id]/sessions/[sessionId]/tasks/[taskId]` | deprecated alias — smoke optional |
| `/manager/equipments/[id]` | |
| `/manager/equipments/borrow` | |
| `/manager/workshops/[id]` | |
| `/manager/projects/[id]` | |
| `/manager/accounting/phases/[id]` | |
| `/manager/accounting/phases/[id]/students/[sppId]` | |
| `/manager/sent/[id]` | |

### 8.5 Teacher panel

| Route | Coverage |
|-------|----------|
| `/teacher` | |
| `/teacher/classes` | |
| `/teacher/classes/[id]` | |
| `/teacher/classes/[id]/tasks/[taskId]` | |
| `/teacher/settings` | |
| `/manager/workshops` (when instructor/mentor + `workshops.view`) | |

Note: `ROUTES.TEACHER_CLASS_SESSION_DETAIL` exists in constants; **no `page.tsx` today** — add to inventory when the page ships.

### 8.6 Student panel

| Route | Coverage |
|-------|----------|
| `/student` | |
| `/student/classes` | |
| `/student/classes/[id]` | |
| `/student/classes/[id]/tasks/[taskId]` | |
| `/student/payments` | |
| `/student/payments/[sppId]` | |
| `/student/borrowings` | |
| `/manager/workshops` (when instructor/mentor + `workshops.view`) | |

### 8.7 Other staff portal roots

These roles use a **thin panel root** plus **filtered access** to shared `/manager/*` (see `panel-nav.ts`).

| Route | Role | Typical shared surfaces | Coverage |
|-------|------|-------------------------|----------|
| `/admin` | admin | Manage workshops when instructor/mentor | |
| `/co-manager` | co-manager | Same pattern as admin | |
| `/ceo` | ceo | Instructors, schedules, workshops, guests, AI usage, income analytics, academic analysis | |
| `/supervisor` | supervisor | Same catalog as manager, filtered by grants | |
| `/crm` | crm | Guests (+ workshops when allowed) | |

### 8.8 Critical mutation journeys (cross-route)

These are the **happy paths** that must eventually exist (beyond “page loads”):

| ID | Journey | Primary phase |
|----|---------|---------------|
| J1 | Create staff user → detail/list | 4 |
| J2 | Create student → detail/list | 4 |
| J3 | Registration status / guest flow sample | 4 |
| J4 | Create subject (+ catalog open) | 5 |
| J5 | Create semester/team → open detail | 5 |
| J6 | Create class → enroll student | 5 |
| J7 | Session attendance or task grade write (one) | 6 |
| J8 | Equipment create + borrow/return | 7 |
| J9 | Instructor schedule slot create/edit | 7 |
| J10 | Workshop create/open + payments page | 7 |
| J11 | Accounting phase → SPP → record payment (`@money`) | 8 |
| J12 | Income statement / analytics load (+ light write if safe) | 8 |
| J13 | Email compose load; send only if `E2E_ALLOW_EMAIL=1` | 9 |
| J14 | Gallery / project / blog create sample | 9 |
| J15 | Notification create / mark read | 9 |
| J16 | Teacher: open class → task; optional grade write | 11 |
| J17 | Student: open class, payment detail, borrowings | 12 |
| J18 | Restricted role: nav hidden + deep-link blocked | 14 |

---

## 9. Phased rollout

### Phase 0 — Foundation ✅ Done

**Goal:** Tooling works; zero product risk.

1. ✅ Install `@playwright/test` + browsers.  
2. ✅ Add `playwright.config.ts` (baseURL, CI retries, trace on first retry).  
3. ✅ Add `e2e/` + npm scripts.  
4. ✅ Document env in `.env.example` (names only) + `[03] local-setup.md`.  
5. ✅ Smoke: `e2e/public/marketing.spec.ts` → `/` brand/home content (`@smoke`).  
6. Optional CI job (do not block merge until Phase 1–3 stable).

**Exit:** ✅ `npm run test:e2e` passes home smoke.

**Risk:** Low.

---

### Phase 1 — Auth & session (all roles) ✅ Done

**Goal:** Login/logout and role redirect match production.

| Spec | Covers |
|------|--------|
| `auth/login.spec.ts` | ✅ Manager (+ other seeded roles) → correct home |
| `auth/login-invalid.spec.ts` | ✅ Bad password → error |
| `auth/logout.spec.ts` | ✅ Logout |
| `auth/redirect-by-role.spec.ts` | ✅ Each seeded role lands on `getDashboardRouteForRole` |
| `auth/panel-guard.spec.ts` | ✅ Unauthed `/manager/*` → login |

**Fixtures:** ✅ `loginAs(role)` + `storageState` files: manager, teacher, student (required); admin, ceo, crm, supervisor, co-manager optional via `E2E_SETUP_ALL_ROLES=1`.

**Exit:** ✅ Manager auth reliable; manager + teacher + student storageState; maintenance mode **off** in E2E env.

**Risk:** Medium (auth flake) — mitigate with storageState + fixed seed users.

---

### Phase 2 — Public site & invite forms ✅ Done

**Goal:** Full public marketing + registration surfaces.

| Spec | Focus |
|------|-------|
| `public/marketing.spec.ts` | ✅ `/`, about, careers, projects, gallery, blogs (+ one slug), life (+ one id), careers roadmap detail |
| `public/register.spec.ts` | ✅ Form UI; submit gated without `E2E_ALLOW_REGISTER=1` |
| `public/invite-forms.spec.ts` | ✅ Invalid guest + `/f/[token]` smoke; seeded tokens optional via env |
| `public/maintenance.spec.ts` | ✅ Page renders (do not enable maintenance for whole E2E env) |
| `public/auth-pages.spec.ts` | ✅ Login (+ signup disabled path) render |

**Exit:** ✅ All §8.1 rows have at least smoke `S` except callback; registration submit gated.

**Risk:** Low–medium (Turnstile / seeded content).

---

### Phase 3 — Manager navigation smoke (read-only)

**Goal:** Every manager **list/root** route in §8.3 opens without crash.

**Approach:** Parameterized `manager/smoke-nav.spec.ts` walking sidebar groups + off-nav pages (`cron-jobs`, `subjects/catalog`, `workshops/payments`, income history, email compose).

**Assertions (light):** no Next error overlay; main heading/landmark; sidebar click where linked (`prefetch={false}` is fine).

**Do not yet:** create/delete data.

**Exit:** Full-permission manager opens all §8.3 routes.

**Risk:** Low–medium (slow pages) — generous timeouts only where measured.

---

### Phase 4 — Manager people (users, students, registrations, guests)

| Suite | Journeys |
|-------|----------|
| Users | Create → toast → list/detail; edit safe fields |
| Students | Create → detail; edit; optional status |
| Registrations | List → detail; one status update if safe |
| Guests | List → detail; one update if safe |

**Align:** wait for toast / dialog close (`usePendingAwareOpenChange`); unique emails.

**Exit:** J1–J3 green (or J3 smoke-only if mutations unsafe).

**Risk:** Medium (timing/toasts).

---

### Phase 5 — Manager academics (subjects, teams, classes, enroll)

1. Subjects create/edit + catalog open  
2. Semesters (“teams”) create → detail  
3. Classes create linked as UI requires  
4. Enroll student; one remove/transfer happy path  
5. Open class detail tabs that exist without deep grade writes yet  

**Exit:** J4–J6 green on dedicated E2E data.

**Risk:** Higher (RPC + multi-table) — keep journeys short.

---

### Phase 6 — Manager class deep path (grades, sessions, tasks, categories)

1. Categories page loads  
2. Grades list → one student grade detail  
3. Session detail loads  
4. Task detail loads  
5. `@mutation`: one attendance **or** one task grade write  
6. `@slow` optional: certificate/export later  

**Exit:** All §8.4 class deep routes smoke; J7 if product-ready.

**Risk:** High complexity — smoke PR then mutation PR.

---

### Phase 7 — Equipment, instructors, schedules, workshops

| Area | Focus |
|------|-------|
| Equipment | List → detail; create; borrow page + borrow/return |
| Instructors | List + one mutation if UI stable |
| Instructor schedules | List + details; create/edit one slot (J9) |
| Workshops | List → detail; payments page; create (J10) |

**Exit:** J8–J10 green (or smoke + one mutation each).

**Risk:** Medium.

---

### Phase 8 — Finance & analysis (`@money` gated)

| Area | Focus |
|------|-------|
| Accounting | List → phase → SPP; optional payment on **test SPP only** (J11) |
| Income statement | Main + analytics + history load |
| Academic analysis | Page load (+ filters if stable) |

**Rules:** staging/test project only; default local run skips `@money` writes unless `E2E_ALLOW_MONEY=1`. Do not re-assert currency math already in Vitest.

**Exit:** Navigation green; optional controlled payment green.

**Risk:** High on shared DB — isolate rows.

---

### Phase 9 — Email, content, notifications

| Area | Focus |
|------|-------|
| Emailing | List + compose load; sent list + detail |
| Send | Only if `E2E_ALLOW_EMAIL=1` + Mailtrap |
| Gallery / projects / blogs | List + one create each (J14); project detail |
| Notifications | Create + mark read (J15) |

**Exit:** J13–J15 (send may stay skipped).

**Risk:** Medium; third-party email gated.

---

### Phase 10 — Manager system surfaces

| Area | Focus |
|------|-------|
| Backup | Page loads; destructive backup actions **skipped** or gated |
| Logs | List/detail open |
| RBAC / Permissions | Page loads; do **not** randomly revoke live grants in CI |
| Settings | Load; one safe setting toggle if reversible |
| Cron jobs | Load only |
| Cloudflare AI usage | Load only |

**Exit:** All system rows in §8.3 have smoke `S`; no unsafe writes in default suite.

**Risk:** Medium (settings/backup side effects) — prefer read-only.

---

### Phase 11 — Teacher portal

| Spec | Focus |
|------|-------|
| `teacher/smoke-nav.spec.ts` | `/teacher`, classes, settings |
| `teacher/classes.spec.ts` | Class detail → task detail; optional write (J16) |
| Workshops deep-link | If teacher is instructor/mentor with grant |

**Exit:** All §8.5 existing pages covered; session route added when page exists.

**Risk:** Medium.

---

### Phase 12 — Student portal

| Spec | Focus |
|------|-------|
| `student/smoke-nav.spec.ts` | Profile, classes, payments, borrowings |
| `student/classes.spec.ts` | Class + task detail |
| `student/payments.spec.ts` | List + SPP detail (J17) |
| `student/borrowings.spec.ts` | List load (mutations only if student can borrow in UI) |

**Exit:** All §8.6 rows smoke; J17 green.

**Risk:** Medium (seeded enrollment/payment data required).

---

### Phase 13 — Other staff portals (admin, co-manager, CEO, supervisor, CRM)

**Goal:** Role roots + **their** nav items on shared `/manager/*`.

| Spec | Focus |
|------|-------|
| `portals/admin.spec.ts` | `/admin` loads; workshops access rules |
| `portals/co-manager.spec.ts` | `/co-manager` loads |
| `portals/ceo.spec.ts` | CEO nav targets from `CEO_PANEL_NAVIGATION` |
| `portals/supervisor.spec.ts` | Supervisor sees granted manager items only |
| `portals/crm.spec.ts` | Guests (+ workshops when allowed) |

**Exit:** §8.7 roots + each role’s nav targets smoke with that role’s `storageState`.

**Risk:** Medium (seed permission drift) — document required grants per E2E user.

---

### Phase 14 — RBAC & cross-panel gates

Automate critical parts of the RBAC regression checklist:

1. Restricted user: sidebar hides Users; `/manager/users` blocked/redirected  
2. Missing `*.create`: Add button hidden; forced action unauthorized if testable  
3. Teacher cannot open exclusive manager paths  
4. Student cannot open manager/teacher exclusives  
5. CRM cannot open accounting/users  
6. Instructor + `workshops.view` can open workshops; without flag cannot  

Keep `npm run smoke:authz` for engine checks; E2E covers **UI + route feel** (J18).

**Exit:** Critical B/E checklist cases have automated counterparts.

**Risk:** Medium.

---

### Phase 15 — CI hardening & maintenance

1. GitHub Action: install → start app (or preview URL) → Playwright  
2. Upload trace/artifact on failure  
3. Shard if runtime > ~15–20 min  
4. **PR job:** `@smoke` = Phase 0–3 + auth + public marketing (~few minutes)  
5. **Nightly:** full suite including `@money` / `@slow` / email when secrets exist  
6. Quarantine list + owner  
7. Update §8 whenever a new `page.tsx` ships  

**Exit:** PR smoke reliable; nightly full documented.

---

## 10. Suggested implementation order (PRs)

| PR | Phase | Title idea |
|----|-------|------------|
| 1 | 0 | chore(e2e): add Playwright + home smoke |
| 2 | 1 | test(e2e): auth login/logout + multi-role storageState |
| 3 | 2 | test(e2e): public site + invite form smokes |
| 4 | 3 | test(e2e): manager full nav smoke |
| 5 | 4 | test(e2e): users/students/registrations/guests |
| 6 | 5 | test(e2e): subjects/teams/classes enroll |
| 7 | 6 | test(e2e): class grades/sessions/tasks |
| 8 | 7 | test(e2e): equipment/instructors/schedules/workshops |
| 9 | 8 | test(e2e): accounting + finance analytics |
| 10 | 9 | test(e2e): email/content/notifications |
| 11 | 10 | test(e2e): manager system surfaces |
| 12 | 11–12 | test(e2e): teacher + student portals |
| 13 | 13–14 | test(e2e): staff portals + RBAC gates |
| 14 | 15 | ci: Playwright PR smoke + nightly full |

Each PR: specs + sparse `data-testid` + checklist/§8 ticks. **No unrelated feature refactors.**

---

## 11. Priority matrix

| Priority | Why | Phase |
|----------|-----|-------|
| P0 Auth | Nothing else works | 1 |
| P0 Public home + login | Entry points | 0–2 |
| P0 Manager nav smoke | Catch broken pages early | 3 |
| P0 Users/Students create | Daily manager work | 4 |
| P1 Classes/enroll | Core school workflow | 5 |
| P1 Teacher + student smoke | Real end users | 11–12 |
| P1 RBAC gates | Security regressions | 14 |
| P2 Grades deep path | Complex but critical | 6 |
| P2 Accounting nav | Money-adjacent | 8 |
| P2 Other staff portals | Shared `/manager/*` access | 13 |
| P3 Email send / exports / backup writes | Slow / external / destructive | 9–10 |
| P3 Invite token submits | Needs seeded tokens | 2 |

---

## 12. Anti-patterns (avoid)

- Replacing Vitest with E2E  
- Asserting exact CSS classes or animation frames  
- `waitForTimeout(5000)` as primary sync  
- One mega-spec for the whole manager panel  
- Testing every RBAC key in the browser (unit + `smoke:authz` + UI samples)  
- Running `@money` / backup restore on production Supabase  
- Special “E2E mode” payloads from server actions  
- Claiming coverage for routes that only redirect to empty shells without `@wip`  

---

## 13. Alignment with current architecture

```text
E2E browser
    → Next.js pages / server actions   (unchanged contracts)
        → services (RBAC + rules)      (still source of truth)
            → repositories → Supabase
```

E2E does **not** call repositories directly.  
E2E does **not** bypass middleware.  
Debug order: env/seed → selector → toast/action state → service error → DB seed.

**UI contracts to respect:**

- Toasts via `@/lib/toast` / `useActionStateToast`  
- Mutation dialogs: pending-aware dismiss + auto-close on success  
- Route top loader: do not assert as business outcome  

---

## 14. Definition of “integrate it now”

**Now = Phase 3 (manager nav smoke).** Phases 0–2 are ✅ done.

1. [x] Install Playwright  
2. [x] Config + `npm run test:e2e`  
3. [x] Home smoke green  
4. [x] Manager (+ ideally teacher/student) test users in env  
5. [x] Login spec green + `storageState`  
6. [x] `[03] local-setup.md`  
7. [x] Tick Phase 0–1 in `[02] phase-checklist.md`  
8. [x] Phase 2 public + invite smokes  

Next: Phase 3 → continue through §9 until §8 tables are complete.

---

## 15. Companion files in this folder

| File | Purpose |
|------|---------|
| `[01] e2e-testing-plan.md` | This plan (source of truth + inventory) |
| `[02] phase-checklist.md` | Tick boxes as phases ship |
| `[03] local-setup.md` | How to run E2E locally (create in Phase 0) |

---

## 16. Success picture

- PR CI runs **auth + public smoke + manager nav smoke + users/students** on every PR  
- Nightly runs academics, finance `@money`, teacher/student, staff portals, RBAC  
- New `page.tsx` → row in §8 + smoke spec in the same feature PR when user-critical  
- Manual RBAC checklist shrinks to edge cases  
- Product logic stays in services + Vitest; E2E guards full-app journeys  

---

## 17. Keeping this plan current

When you add or rename a route:

1. Update `lib/constants/routes.ts` / `panel-nav.ts` (product PR).  
2. Add/rename the row in §8.  
3. Attach it to an existing phase or add a sub-bullet.  
4. Prefer a smoke assertion in the same PR as the page if it is manager/teacher/student critical.

---

*End of plan. Implement phase by phase; do not skip Phase 0–1. Full-app coverage = all §8 rows marked + J1–J18 addressed.*
