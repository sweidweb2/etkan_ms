# E2E phase checklist

Track progress against [`[01] e2e-testing-plan.md`](./[01]%20e2e-testing-plan.md).  
Tick only when the phase **exit criteria** are met (specs green + Vitest/typecheck/lint green + no unsafe product hacks).  
Also mark matching rows in the plan’s **§8 inventory** tables.

**Last updated:** 2026-10-24

---

## Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Foundation (Playwright + home smoke) | [ ] Not started | Integrate tooling first |
| 1 | Auth & session (all roles) | [ ] Not started | storageState per seeded role |
| 2 | Public site & invite forms | [ ] Not started | Turnstile / token seeds |
| 3 | Manager nav smoke (all list routes) | [ ] Not started | Full §8.3 |
| 4 | Manager people CRUD | [ ] Not started | Users, students, registrations, guests |
| 5 | Manager academics | [ ] Not started | Subjects, teams, classes, enroll |
| 6 | Manager class deep path | [ ] Not started | Grades / sessions / tasks |
| 7 | Equipment / instructors / schedules / workshops | [ ] Not started | |
| 8 | Finance & analysis | [ ] Not started | `@money` gated |
| 9 | Email / content / notifications | [ ] Not started | Gate real email send |
| 10 | Manager system surfaces | [ ] Not started | Prefer read-only |
| 11 | Teacher portal | [ ] Not started | |
| 12 | Student portal | [ ] Not started | Needs seeded class/payment data |
| 13 | Other staff portals | [ ] Not started | admin, co-manager, CEO, supervisor, CRM |
| 14 | RBAC & cross-panel gates | [ ] Not started | Align with RBAC checklist B/E |
| 15 | CI hardening | [ ] Not started | PR `@smoke` + nightly full |

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Per-phase exit ticks

### Phase 0

- [ ] Playwright installed; browsers installed  
- [ ] `npm run test:e2e` works  
- [ ] Home smoke passes  
- [ ] `[03] local-setup.md` written  
- [ ] No unrelated feature changes  

### Phase 1

- [ ] Manager login passes  
- [ ] Invalid login shows error (no silent success)  
- [ ] Logout works  
- [ ] `storageState` for manager (+ teacher/student when seeded)  
- [ ] Role redirect checked for each seeded role  
- [ ] Unauthed panel → login  

### Phase 2

- [ ] Public marketing routes smoke (§8.1)  
- [ ] Login (+ signup if enabled) render  
- [ ] Registration submit gated/safe  
- [ ] Guest token + `/f/[token]` smoke (with seeds)  

### Phase 3

- [ ] All manager list/root routes in §8.3 open without error overlay  
- [ ] Sidebar navigation covered for linked routes  

### Phase 4

- [ ] Create staff user happy path  
- [ ] Create student happy path  
- [ ] Edit path for at least one of user/student  
- [ ] Registrations + guests list/detail (mutation if safe)  
- [ ] Unique test data; no production DB  

### Phase 5

- [ ] Subject create (or stable seeded subject) + catalog open  
- [ ] Semester/team create/open  
- [ ] Class create/open  
- [ ] Enroll student happy path  

### Phase 6

- [ ] Categories + grades + student grade detail load  
- [ ] Session + task deep links load  
- [ ] Optional `@mutation` attendance/task write  

### Phase 7

- [ ] Equipment create + borrow/return (or create + borrow page)  
- [ ] Instructors list (+ mutation if stable)  
- [ ] Instructor schedule one slot mutation  
- [ ] Workshops list/detail + payments page  

### Phase 8

- [ ] Accounting list + phase + SPP open  
- [ ] Income statement + analytics + history open  
- [ ] Academic analysis open  
- [ ] `@money` writes only on isolated rows (or skipped in default run)  

### Phase 9

- [ ] Emailing + compose + sent detail open  
- [ ] Email send skipped unless env allows  
- [ ] Gallery / projects / blogs: list + one create sample  
- [ ] Notifications create/read  

### Phase 10

- [ ] Backup / logs / RBAC / settings / cron-jobs / AI usage smoke  
- [ ] No destructive backup/RBAC writes in default suite  

### Phase 11

- [ ] Teacher root + classes + settings smoke  
- [ ] Class → task journey  
- [ ] Workshops access sample if instructor/mentor  

### Phase 12

- [ ] Student profile / classes / payments / borrowings smoke  
- [ ] Class + task + payment detail  
- [ ] Seeded enrollment/payment data documented  

### Phase 13

- [ ] `/admin`, `/co-manager`, `/ceo`, `/supervisor`, `/crm` roots  
- [ ] Each role’s nav targets from `panel-nav.ts` smoke  

### Phase 14

- [ ] Restricted nav/route gate  
- [ ] Teacher/student blocked from exclusive manager paths  
- [ ] CRM blocked from exclusive manager paths (sample)  
- [ ] Workshops instructor gate sample  

### Phase 15

- [ ] PR CI: `@smoke` (Phase 0–3 + auth)  
- [ ] Nightly: fuller suite + artifacts on failure  
- [ ] Flake quarantine process documented  
- [ ] §8 inventory fully marked for shipped pages  

---

## Safety reminder (every PR)

- [ ] `npm test` green  
- [ ] `npm run typecheck` green  
- [ ] `npm run lint` green  
- [ ] No RBAC/auth bypass for tests  
- [ ] No production Supabase for destructive E2E  

---

## PR log (optional)

| Date | PR / branch | Phases touched | Result |
|------|-------------|----------------|--------|
| | | | |
