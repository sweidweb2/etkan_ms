# Etkan MS — E2E testing plan (phase-based)

**Goal:** Add end-to-end (browser) tests gradually, group by group, without rewriting product features or breaking current logic.  
**Stack recommendation:** **Playwright** (fits Next.js App Router + TypeScript; strong CI story).  
**Date:** 2026-09-04  
**Folder:** `docs/[07] Reports/e2e/`

---

## 0. Verdict / how to use this plan

| Rule | Meaning |
|------|---------|
| **E2E is additive** | Do not change business rules “to make tests pass.” Fix tests or add test hooks only when needed. |
| **Unit tests stay primary** | Keep `npm test` (Vitest) for validators/services. E2E covers real browser + auth + navigation + critical clicks. |
| **One phase at a time** | Finish a phase (green locally) before starting the next suite. |
| **Manager first** | Manager panel is the real product surface today; other roles come later. |
| **No big-bang rewrite** | Never “add E2E by refactoring half the app.” |

**Related existing QA (keep using):**

- `docs/[06] RBAC/[06] regression-checklist.md` — manual RBAC QA (later automate pieces in Phase 3–4)
- `npm run smoke:authz` — authorization smoke (keep; not a replacement for UI E2E)
- `npm test` — Vitest unit/service tests (must stay green every phase)

---

## 1. What E2E is (simple words)

**Unit test:** “Does this function return the right answer?” (fast, no browser)  
**E2E test:** “Can a real user open the site, log in, click Add student, see success?” (slower, real browser)

E2E is for **journeys that break when layers disagree** (middleware + page + action + toast + RBAC).

Do **not** try to E2E every validator edge case — Vitest already covers most of that (~100+ test files).

---

## 2. What you have today

| Layer | Status |
|-------|--------|
| Vitest unit/service tests | Strong (keep growing) |
| Playwright / Cypress | **Not installed** |
| CI for E2E | None yet |
| Seed scripts | `seed:admin`, `seed:manager`, `seed:demo`, `seed:rbac`, etc. |
| Auth | Supabase email/password + cookies |
| Mature UI | Manager (+ shared CEO/co-manager routes) |
| Thin / shell panels | Parts of teacher, student, admin, trainer (per status scans) — test only what is real |

---

## 3. Tooling choice: Playwright

**Use Playwright**, not Cypress, for this app:

- Official Next.js-friendly docs and App Router support  
- Parallel browsers, good auth storage (`storageState`)  
- Trace/video on failure (helps debug flaky UI)  
- Easy `npx playwright test` + GitHub Action later  

**Out of scope for v1:** visual screenshot regression, mobile device farms, load testing.

---

## 4. Safety rules while implementing E2E (do not break features)

### Must follow every phase

1. **No product behavior changes** unless a test reveals a real bug — then fix the bug with a normal PR, not a “test-only hack.”  
2. **Prefer `data-testid` only when needed** — first try role/label/text already in the UI (`getByRole`, `getByLabel`). Add `data-testid` sparingly and only on stable controls.  
3. **Never weaken auth/RBAC** for tests (no “skip permission if NODE_ENV=test” in services).  
4. **Dedicated test users / test DB** — do not run destructive E2E against production.  
5. **Idempotent seeds** — each suite can reset or use unique usernames/emails (`e2e_${Date.now()}_…`).  
6. **Gate CI:** E2E fails the pipeline only after Phase 0–1 are stable; until then run locally / optional CI job.  
7. **Keep Vitest green** — every E2E PR also runs `npm test` + `npm run typecheck` + `npm run lint`.  
8. **One domain suite per PR when possible** — smaller reviews, easier rollback.  
9. **Flaky test policy:** quarantine or fix; do not delete coverage silently; do not merge “retry until green” without a root cause.  
10. **Align with current UI patterns:** toasts (Sonner helpers), form dialogs (`usePendingAwareOpenChange`), top loader (do not assert top loader as business truth).

### Allowed “test support” changes (safe)

| Allowed | Not allowed |
|---------|-------------|
| Add `data-testid` on buttons/dialogs | Change Zod rules to pass tests |
| Stable env vars for E2E accounts | Bypass middleware in test builds |
| Seed / cleanup scripts under `scripts/e2e/` | Disable RLS/RBAC in app code for E2E |
| Playwright config, fixtures, helpers | Rewrite pages to “be more testable” unless UX benefit is clear |
| Document known skips for unfinished panels | Mark unfinished shells as “passing” by asserting empty headings only (optional smoke later, clearly tagged `@wip`) |

---

## 5. Target folder layout (create gradually)

```text
e2e/
  playwright.config.ts          # or root playwright.config.ts
  fixtures/
    auth.ts                     # login helpers + storageState
    db.ts                       # optional seed/cleanup helpers
  helpers/
    forms.ts
    navigation.ts
    expect-toast.ts
  auth/
    login.spec.ts
  manager/
    smoke-nav.spec.ts
    users.spec.ts
    students.spec.ts
    ...
  rbac/
    route-gates.spec.ts
  public/
    home-register.spec.ts
```

**npm scripts (add in Phase 0):**

```bash
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright --ui
npm run test:e2e:headed   # headed browser
```

Env (local / CI secrets — never commit passwords):

```bash
E2E_BASE_URL=http://127.0.0.1:3000
E2E_MANAGER_EMAIL=...
E2E_MANAGER_PASSWORD=...
E2E_TEACHER_EMAIL=...
E2E_STUDENT_EMAIL=...
# Optional: E2E_RESTRICTED_EMAIL for RBAC tests
```

---

## 6. Test data strategy

| Approach | When |
|----------|------|
| **Seeded fixed accounts** | Login, nav smoke, read-only pages |
| **Create-then-assert** | Create user/student/subject — use unique names |
| **Cleanup after** (best effort) | Delete created rows via UI or admin script when safe |
| **Shared demo seed** | Class/grades/accounting journeys that need linked data (`seed:demo`) |

**Rule:** Prefer unique data over editing the same demo row every run (avoids collisions when tests run in parallel later).

---

## 7. What “done” means for each phase

A phase is **done** when:

- [ ] Specs for that phase pass locally against a known env  
- [ ] No production code changes except allowed test hooks  
- [ ] `npm test` + `typecheck` + `lint` still green  
- [ ] Short note in this folder’s checklist updated (`[02] phase-checklist.md`)  
- [ ] Flakes documented or fixed (none known “random fail”)

---

## 8. Phased rollout

### Phase 0 — Foundation (integrate Playwright now)

**Goal:** Tooling works; zero product risk.

**Work**

1. Install Playwright (`@playwright/test`) + browsers.  
2. Add `playwright.config.ts` (baseURL, retries=1 in CI, trace on first retry).  
3. Add `e2e/` folder + npm scripts.  
4. Document env vars in `.env.example` (names only) + short `docs/[07] Reports/e2e/[03] local-setup.md`.  
5. Create **one** smoke: `e2e/public/home.spec.ts` → open `/` → expect brand/home content.  
6. Wire optional CI job later (do not block merge until Phase 1 is stable).

**Exit criteria**

- `npm run test:e2e` runs and passes the home smoke.  
- No app feature code changed (or only `.gitignore` / docs / package scripts).

**Risk:** Low.

---

### Phase 1 — Auth & session

**Goal:** Login/logout and role redirect work like production.

**Specs**

| Spec | Covers |
|------|--------|
| `auth/login.spec.ts` | Valid manager login → lands on manager home/dashboard |
| `auth/login-invalid.spec.ts` | Bad password → error toast/inline, stays on login |
| `auth/logout.spec.ts` | Logout → login (or public) |
| `auth/redirect-by-role.spec.ts` | Teacher/student accounts land on their panel (when accounts exist) |

**Fixtures**

- `loginAs(role)` helper  
- Save `storageState` for manager to reuse in later phases (faster)

**Align with current logic**

- Use real login form + Supabase session cookies  
- Respect maintenance mode if enabled in test env (document: turn maintenance **off** for E2E env)

**Exit criteria**

- Manager can authenticate in E2E reliably  
- Later suites can start **already logged in**

**Risk:** Medium (auth flakiness) — mitigate with storageState + stable seed users.

---

### Phase 2 — Manager navigation smoke (read-only)

**Goal:** Critical manager routes render without crashing (no heavy mutations yet).

**Approach:** One parameterized smoke file OR small groups:

```text
/manager
/manager/users
/manager/students
/manager/subjects
/manager/classes
/manager/accounting
/manager/schedule
/manager/workshops
/manager/equipments
/manager/notifications
/manager/settings
```

**Assertions (keep light)**

- Status 200 / no Next error overlay  
- Page title or main heading visible  
- Sidebar link works with `prefetch={false}` routes (real click)

**Do not yet:** create/delete data.

**Exit criteria**

- Core manager pages open for a full-permission manager  
- Failures point to broken pages early

**Risk:** Low–medium (slow pages) — use generous timeouts only where measured.

**Maps to:** parts of RBAC checklist section A (open pages).

---

### Phase 3 — Manager people CRUD (users + students)

**Goal:** Highest-traffic create/edit flows match current dialogs/actions.

**Suites**

| Suite | Journeys |
|-------|----------|
| Users | Open Add user → fill → create → toast success → row/detail visible |
| Users | Edit user (safe fields) → save → toast |
| Students | Add student → create → appears in list/detail |
| Students | Edit student → save |
| Students | Optional: status change if UI is stable |

**Align with current UI**

- Dialogs must stay open while pending (`usePendingAwareOpenChange`) — tests wait for success toast / dialog close, not arbitrary sleeps  
- Password: leave blank (default) **or** use generate icon if present — either is fine  
- Field errors stay inline; form errors may toast — assert the pattern you already use

**Data**

- Unique username/email per run  
- Prefer cleanup via UI delete **only if** delete exists and is safe; else leave marked test users and clean with a script weekly

**Exit criteria**

- Create user + create student green  
- No change to create schemas/services except bugfixes

**Risk:** Medium (timing/toasts). Prefer `expect` on toast text from known messages.

---

### Phase 4 — Academics core (subjects, classes, enrollment)

**Goal:** Class lifecycle without breaking accounting hooks.

**Suites (order matters)**

1. **Subjects** — create / edit / (delete if allowed)  
2. **Semesters** — create / open detail  
3. **Classes** — create class linked to subject/semester as UI requires  
4. **Enrollment** — add student to class; remove or transfer **one** happy path  
5. **Session smoke** — open class → session list/detail loads  

**Safety**

- Prefer a dedicated “E2E Class” created by the suite  
- Avoid transferring random production-like demo students if demo data is shared  
- Accounting sync side effects: assert UI success; deep money asserts belong in Phase 6

**Exit criteria**

- Enroll journey green on test data  
- Vitest class/enrollment tests still green

**Risk:** Higher (RPC + multi-table). Keep journeys short; one transfer test only.

---

### Phase 5 — Grades & class deep path

**Goal:** Cover the long academic path from the RBAC checklist without automating every cell.

**Minimum journey**

1. Open class grades page  
2. Open one student grade detail  
3. Open one session → attendance or task surface loads  
4. If stable: mark one attendance / edit one task grade  
5. Optional later: final exam / compute / certificate export (`@slow` tag)

**Tags**

- `@smoke` — open pages only  
- `@mutation` — writes  
- `@slow` — exports/zips  

**Exit criteria**

- Deep links do not 500  
- One write path proven if product-ready

**Risk:** High complexity — split PRs: smoke first, mutations second.

---

### Phase 6 — Accounting & workshops (money-sensitive)

**Goal:** Protect financial paths carefully.

**Accounting (read + light write)**

1. `/manager/accounting` loads  
2. Open one payment phase detail  
3. Open one SPP detail  
4. Optional: create payment on a **test SPP only** (never random live-looking rows)

**Workshops**

1. Workshops list/detail load  
2. Create workshop (if seed-friendly)  
3. Payments page permission-aware load  

**Rules**

- Run against **staging/test project** only  
- Tag `@money` — can skip in default local runs if no seed  
- Do not assert exact currency math in E2E if Vitest already covers it — assert “saved / toast / row appears”

**Exit criteria**

- Phase/SPP navigation green  
- One controlled payment create (optional) green

**Risk:** High if aimed at shared DB — isolate data.

---

### Phase 7 — Ops surfaces (schedule, equipment, notifications, email)

**Goal:** Cover operational CRUD that managers use weekly.

| Area | E2E focus |
|------|-----------|
| Schedule | Create/edit/delete one slot |
| Equipment | Create item; borrow/return one flow |
| Notifications | Create + mark read |
| Emailing | Compose page loads; send only if Mailtrap/test provider configured |
| Gallery / projects | List + create if stable |
| Guests / registrations | Open list/detail; one status update if safe |

**Email rule:** Default CI skips real send unless `E2E_ALLOW_EMAIL=1` and Mailtrap is configured.

**Exit criteria**

- Each area has at least open + one mutation (except email send may stay skipped)

**Risk:** Medium; email/flaky third parties must be gated.

---

### Phase 8 — RBAC & cross-panel gates

**Goal:** Automate the important parts of `docs/[06] RBAC/[06] regression-checklist.md`.

**Suites**

1. Restricted user: sidebar hides Users; `/manager/users` blocked/redirected  
2. Manager without `subjects.create`: Add button hidden; forced action still unauthorized (if testable)  
3. Teacher cannot open exclusive manager paths  
4. Instructor + `workshops.view` can open workshops; non-instructor cannot deep-link  

**Keep** `npm run smoke:authz` as engine-level check; E2E covers **UI + route gate** feel.

**Exit criteria**

- Checklist sections B/E have automated counterparts for the critical cases

**Risk:** Medium (permission seed drift) — document required grants for E2E users.

---

### Phase 9 — Public site & registration

**Goal:** Public marketing + registration paths.

| Spec | Focus |
|------|-------|
| Home | Loads, main CTA visible |
| Auth pages | Login/signup render |
| Register | Happy path **or** validation-only if Turnstile blocks CI |
| Guest token form | Only if test token can be seeded |

**Turnstile / captcha:** Use test keys in E2E env, or skip submit and only assert form UI.

**Exit criteria**

- Public home + login always in default suite  
- Registration submit gated behind env flag

---

### Phase 10 — Other roles (teacher / student / admin / trainer)

**Goal:** Only test **real** panel features; mark shells `@wip` or skip.

**Order**

1. Teacher: dashboard + schedule/classes if wired  
2. Student: dashboard + classes + payments if wired  
3. Admin: dashboard smoke  
4. Trainer: dashboard smoke  

**Rule:** If a page is still a heading-only shell (per project status docs), either skip or assert “page loads” only — do not invent fake coverage.

---

### Phase 11 — CI hardening & maintenance

**Goal:** Make E2E sustainable.

**Work**

1. GitHub Action: install → start app (or use preview URL) → Playwright  
2. Upload trace/artifact on failure  
3. Shard suites if runtime > ~15–20 min  
4. Default PR job: Phase 0–3 (fast)  
5. Nightly job: full suite including `@money` / `@slow`  
6. Quarantine list + owner rotation  
7. Update this plan when new manager domains ship

---

## 9. Suggested implementation order (PRs)

| PR | Phase | Title idea |
|----|-------|------------|
| 1 | 0 | chore(e2e): add Playwright + home smoke |
| 2 | 1 | test(e2e): auth login/logout + manager storageState |
| 3 | 2 | test(e2e): manager read-only nav smoke |
| 4 | 3 | test(e2e): create user + create student |
| 5 | 4 | test(e2e): subject/class enroll happy path |
| 6 | 5 | test(e2e): class grades/session smoke |
| 7 | 6 | test(e2e): accounting phase/SPP navigation |
| 8 | 7 | test(e2e): schedule/equipment/notifications |
| 9 | 8 | test(e2e): RBAC route and nav gates |
| 10 | 9–10 | test(e2e): public + role panels |
| 11 | 11 | ci: Playwright on PR (smoke) + nightly full |

Each PR must include: specs + any `data-testid` + checklist tick update. **No unrelated feature refactors.**

---

## 10. Priority matrix (what to automate first)

| Priority | Why | Phase |
|----------|-----|-------|
| P0 Auth | Nothing else works without it | 1 |
| P0 Manager nav smoke | Catch broken pages early | 2 |
| P0 Users/Students create | Daily manager work | 3 |
| P1 Classes/enroll | Core school workflow | 4 |
| P1 RBAC gates | Security regressions | 8 |
| P2 Grades deep path | Complex but critical | 5 |
| P2 Accounting nav | Money-adjacent | 6 |
| P3 Email send / exports | Slow / external | 7, 5 |
| P3 Thin role panels | Until product-complete | 10 |

---

## 11. Anti-patterns (avoid)

- Replacing Vitest with E2E  
- Asserting exact CSS classes or animation frames  
- Sleeping `waitForTimeout(5000)` as the main sync strategy  
- One 2,000-line mega-spec  
- Testing every RBAC key in the browser (use unit + smoke:authz + a few UI samples)  
- Running `@money` tests on production Supabase  
- Changing server actions to return special “E2E mode” payloads  

---

## 12. Alignment with current architecture

```text
E2E browser
    → Next.js pages / server actions   (unchanged contracts)
        → services (RBAC + rules)      (still source of truth)
            → repositories → Supabase
```

E2E does **not** call repositories directly.  
E2E does **not** bypass middleware.  
When a test fails, debug in this order: env/seed → UI selector → toast/action state → service error → DB seed.

---

## 13. Definition of “integrate it now”

**Now (this week) = Phase 0 + Phase 1 start.**

Immediate checklist:

1. [ ] Install Playwright  
2. [ ] Config + `npm run test:e2e`  
3. [ ] Home smoke green  
4. [ ] Manager test user in env  
5. [ ] Login spec green + save `storageState`  
6. [ ] Document local setup in `[03] local-setup.md`  
7. [ ] Tick Phase 0–1 in `[02] phase-checklist.md`

Then continue Phase 2 → 3 in following PRs.

---

## 14. Companion files in this folder

| File | Purpose |
|------|---------|
| `[01] e2e-testing-plan.md` | This plan (source of truth) |
| `[02] phase-checklist.md` | Tick boxes as phases ship |
| `[03] local-setup.md` | How to run E2E locally (create in Phase 0) |

---

## 15. Success picture (3 months)

- PR CI runs **auth + manager smoke + users/students** on every PR (~few minutes)  
- Nightly runs deeper academics/accounting  
- New manager features add a small E2E spec in the **same PR** when the flow is user-critical  
- Manual RBAC checklist shrinks to edge cases only  
- Product logic stays owned by services + Vitest; E2E guards journeys

---

*End of plan. Implement phase by phase; do not skip Phase 0–1.*
