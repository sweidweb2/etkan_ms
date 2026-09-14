# E2E phase checklist

Track progress against [`[01] e2e-testing-plan.md`](./[01]%20e2e-testing-plan.md).  
Tick only when the phase **exit criteria** are met (specs green + Vitest/typecheck/lint green + no unsafe product hacks).

**Last updated:** 2026-09-04

---

## Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Foundation (Playwright + home smoke) | [ ] Not started | Integrate tooling first |
| 1 | Auth & session | [ ] Not started | storageState for manager |
| 2 | Manager nav smoke (read-only) | [ ] Not started | Core routes only |
| 3 | Users + students CRUD | [ ] Not started | Unique emails per run |
| 4 | Subjects / classes / enroll | [ ] Not started | Dedicated E2E class data |
| 5 | Grades & class deep path | [ ] Not started | Smoke before mutations |
| 6 | Accounting & workshops | [ ] Not started | Test DB only; `@money` tag |
| 7 | Schedule / equipment / notifications / email | [ ] Not started | Gate real email send |
| 8 | RBAC & cross-panel gates | [ ] Not started | Align with RBAC checklist B/E |
| 9 | Public site & registration | [ ] Not started | Turnstile test keys / skip submit |
| 10 | Teacher / student / admin | [ ] Not started | Skip unfinished shells |
| 11 | CI hardening | [ ] Not started | PR smoke + nightly full |

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
- [ ] `storageState` saved for manager reuse  
- [ ] Role redirect checked for at least one non-manager account (if seeded)  

### Phase 2

- [ ] Core manager routes open without error overlay  
- [ ] Sidebar navigation covered for those routes  

### Phase 3

- [ ] Create staff user happy path  
- [ ] Create student happy path  
- [ ] Edit path for at least one of user/student  
- [ ] Unique test data; no production DB  

### Phase 4

- [ ] Subject create (or stable seeded subject)  
- [ ] Class create/open  
- [ ] Enroll student happy path  

### Phase 5

- [ ] Grades page + one student detail load  
- [ ] Session deep link loads  
- [ ] Optional `@mutation` attendance/task write  

### Phase 6

- [ ] Accounting list + phase + SPP open  
- [ ] Workshops list/detail open  
- [ ] `@money` writes only on isolated rows (or skipped in default run)  

### Phase 7

- [ ] One schedule mutation  
- [ ] One equipment borrow/return (or create)  
- [ ] Notifications create/read  
- [ ] Email send skipped unless env allows  

### Phase 8

- [ ] Restricted nav/route gate  
- [ ] Teacher blocked from exclusive manager path  
- [ ] Workshops instructor gate sample  

### Phase 9

- [ ] Public home in default suite  
- [ ] Login page render  
- [ ] Registration submit gated/safe  

### Phase 10

- [ ] Real teacher journeys only  
- [ ] Real student journeys only  
- [ ] Shell pages skipped or tagged `@wip`  

### Phase 11

- [ ] PR CI: Phase 0–3 (or agreed smoke set)  
- [ ] Nightly: fuller suite + artifacts on failure  
- [ ] Flake quarantine process documented  

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
