# [01] Emails business logic audit

**Project:** Etkan MS (`etkan_ms`)  
**Date:** 2026-07-28  
**Scope:** Manager Emailing (templates + Full customization), Sent list/detail, Resend, Mailtrap delivery, `email_sent` / `email_users`  
**Purpose:** Confirm the email feature integrated on 2026-07-28 works end-to-end; list what is solid, what edge cases exist, and what to do next (task-based).

---

## Executive summary

Manager emailing is **wired end-to-end**: compose → validate → allocate circular Ref → Mailtrap → track recipients. Sent history UI exists. Resend reuses the same circular.

| Area | Verdict |
|------|---------|
| Sidebar Email group (Emailing + Sent) | Working |
| Template compose dialog (6 templates) | Working |
| Full customization (TipTap + To chips) | Working |
| Front + back Zod validation | Working |
| Ref. N/YYYY allocation (DB lock) | Working |
| `email_sent` / `email_users` logging | Working |
| Sent list + detail + body copy | Working |
| Resend dialog (search + bulk roles) | Working |
| Class / role / name / email filters | Working |
| AR RTL / EN LTR chrome + compose inputs | Working |
| Partial mid-loop send | **Known risk** (see gaps) |
| Resend keeps TipTap HTML | **Gap** (plain body only) |
| RLS on email tables | **Gap** (service-role only today) |

**Bottom line:** The feature is usable and logically coherent for school circulars. No blocking “broken path” found for the happy path. Remaining items are reliability / fidelity polish (queue-or-pending pattern, store HTML for resend, RLS).

---

## 1. Domain model

### Flow

```text
Manager compose
  → Zod validate (client + server)
  → create email_sent (Ref. N/YYYY)
  → for each recipient: Mailtrap send → upsert email_users
  → toast with Ref.
```

### Tables

| Table | Role |
|-------|------|
| `email_sent` | One row per circular: title, plain body snapshot, locale, template_id, reference_code, created_by |
| `email_users` | One row per address per circular: delivery_status, sent_at, mailtrap_message_id, optional student_id (profile id) |

Unique `(email_sent_id, email_address)`. Status enum: `pending | sent | failed | skipped` (`pending` / `skipped` reserved; app writes `sent` / `failed` today).

### Mailtrap vs Etkan

| Owner | Responsibility |
|-------|----------------|
| **Etkan server** | Who to send to, template HTML, Ref, DB tracking |
| **Mailtrap** | Deliver **each accepted** API message (inbox retries, etc.) |

Mailtrap does **not** finish a half-done recipient loop if the server dies mid-batch.

---

## 2. Manager SOP (happy paths)

### Task A — Send from Emailing (template dialog)

1. Open **Manager → Email → Emailing**.
2. Filter/select users (or use **Send custom email** for a typed address).
3. Use a **Ready action**, row **Message**, or **Send all**.
4. Fill template fields + language → **Send**.
5. Expect toast with `Ref.: N/YYYY` and rows in Sent.

### Task B — Full customization

1. Click **Full customization** (Emailing, Sent list, or Sent detail).
2. To: typeahead chips and/or All users / students / teachers / managers / admins / CEOs.
3. Subject + TipTap body; Arabic → RTL inputs, English → LTR.
4. **Send** → same pipeline with `templateId = custom` (+ `bodyHtml`).

### Task C — Browse Sent

1. **Manager → Email → Sent**.
2. Search / open a row → detail (metadata, body, `email_users` table).
3. Optional: copy body; **Resend** from the list.

### Task D — Resend

1. On Sent list, **Resend** on a row.
2. Pick recipients (same To UX as Full customization).
3. App reloads that `email_sent` title/body, keeps **same Ref.**, sends as `custom`, upserts `email_users`.

---

## 3. Architecture map (for implementers)

| Layer | Location |
|-------|----------|
| Routes | `/manager/emailing`, `/manager/emailing/compose`, `/manager/sent`, `/manager/sent/[id]` |
| Nav | `lib/constants/panel-nav.ts` → group `email` |
| UI | `components/manager/emailing/*` |
| Actions | `app/manager/emailing/actions.ts`, `app/manager/sent/actions.ts` |
| Validators | `lib/validators/manager/send-email.ts`, `resend-email.ts` |
| Service | `services/email.service.ts` |
| Templates | `lib/email/templates/*` |
| Repos | `repositories/email-sent.repository.ts`, `email-users.repository.ts` |
| Mailtrap | `lib/mailtrap/client.ts` |
| Migration | `supabase/migrations/20260728000000_email_sent_and_email_users.sql` |

Auth: middleware `/manager/*` + service `actorRole === manager`.

---

## 4. Correctness checklist (scan result)

### Working as intended

- [x] Manager-only send / list / resend  
- [x] Six templates + shared administrative circular shell (EN/AR)  
- [x] Client + server Zod (recipients, subject/body, emails, dates/URLs where typed)  
- [x] Empty TipTap (`<p></p>`) rejected  
- [x] Recipient email dedupe in service  
- [x] Ref allocation under concurrency (advisory lock in RPC)  
- [x] Per-recipient `sent` / `failed` logging  
- [x] Compose dialog follows pending-aware dismiss + toast + close-on-success  
- [x] Emailing table filters: name, email, role, class (class trigger shows **name**, not id)  
- [x] Sent list stats + detail body copy + Full customization entry points  

### Known edge cases (not “broken”, but be aware)

| # | Case | What happens | Mitigation today |
|---|------|--------------|------------------|
| 1 | Server timeout / crash mid-recipient loop | Some get mail; Ref already consumed; some missing or `failed` | Sent detail + **Resend** |
| 2 | Resend same address | Upsert **overwrites** that `email_users` row (no multi-attempt history) | Accept or redesign later |
| 3 | Resend after TipTap send | Uses **plain** `email_sent.body` — rich HTML not stored | Content still readable; formatting lost |
| 4 | Browser offline after request started | Server usually continues | N/A |
| 5 | User without email selected | Counted in skip; not mailed | Toast / skip count |
| 6 | Welcome ready-action to many users | Same temp password fields sent to all | Manager discipline |
| 7 | `upsertEmailUser` DB error | Mail may still have been accepted by Mailtrap | Log/monitor (gap) |
| 8 | Locale schema default `en` vs UI default `ar` | FormData usually sends locale explicitly | Prefer aligning defaults later |

### Not in scope yet (by design)

- Auto Welcome on account create  
- Open-tracking (`opened_at`) / Mailtrap webhooks  
- Background queue / job worker  
- RLS policies on `email_sent` / `email_users` (app uses admin/service client)

---

## 5. Task backlog (recommended order)

### P0 — Ops / docs (optional now)

- [x] Product overview: see `emailing-and-templates.md` in this folder  
- [ ] Confirm env: `MAILTRAP_API_KEY`, `MAILTRAP_FROM_EMAIL`, `MAILTRAP_FROM_NAME`  
- [ ] Smoke: `npm run test:mailtrap` then one real circular to a test inbox  

### P1 — Reliability (if lists grow)

- [ ] Before Mailtrap loop: insert `email_users` as `pending`, then update to `sent`/`failed`  
- [ ] Or: chunk sends / raise serverless timeout  
- [ ] Check and surface `upsertEmailUser` errors  

### P2 — Resend fidelity

- [ ] Store `body_html` on `email_sent` (or full rendered HTML) for TipTap resend  
- [ ] Decide product rule: resend = same Ref (current) vs **new** circular  

### P3 — Hardening

- [ ] Enable RLS deny-all for anon/authenticated on email tables; service role only  
- [ ] Sanitize TipTap HTML before embed  
- [ ] Align Zod/parser locale default to `ar`  
- [ ] Remount TipTap on locale change (or always sync `dir` — already mostly handled)  
- [ ] Add **Resend** on Sent detail page (list already has it)  

---

## 6. Manual test plan (task checklist)

Use a manager session and a Mailtrap inbox / sandbox.

### Emailing page

- [ ] Filters: name + email + role + class combine correctly; class label shows name  
- [ ] Select one user → Ready action Welcome → send → appears in Sent with Ref  
- [ ] Select many → Announcement → Send all  
- [ ] Send custom email to external address  
- [ ] Validation: empty required fields show inline errors; no toast for field-only errors  

### Full customization

- [ ] Add user via typeahead; add external email with Enter  
- [ ] Bulk All students / All managers  
- [ ] Arabic: subject + body RTL; English: LTR  
- [ ] Empty body blocked; long subject capped  
- [ ] Success clears form  

### Sent

- [ ] List search by Ref / title  
- [ ] Open detail: body + recipients table statuses  
- [ ] Copy body icon  
- [ ] Resend to a new address → same Ref; new/updated `email_users` row  
- [ ] Full customization button from list and detail  

### Failure simulation (optional)

- [ ] Invalid Mailtrap key → recipients `failed`, toast error  
- [ ] Resend after fixing key succeeds  

---

## 7. Circular content contract

Every send uses the administrative shell (no casual “Hi” greeting):

```text
Ref.: {N}/{year}
Etkan Administrative Circular / تعميم إداري من إتقان

{Title}

Dear Etkan Student / عزيزي طالب إتقان,

{Body}

Contact: asweid657@gmail.com
Ali Sweid / إدارة إتقان
```

From address = `MAILTRAP_FROM_EMAIL` (verified domain). Contact line is fixed for students (not the From).

---

## 8. Verdict

**Ship / use as-is for day-to-day manager circulars.** Logic for compose, validate, allocate Ref, deliver, and track is correct for the happy path. Treat large blasts carefully until P1 pending/chunking exists; use **Resend** for partial failures. Documented gaps above are improvements, not “feature does not work.”
