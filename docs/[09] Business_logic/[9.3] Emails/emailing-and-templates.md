# Emailing and templates

Plain-language product overview for manager emailing in Etkan MS.  
For the logic audit / test checklist, see `[01] emails-logic-audit.md` in this folder.

## What Etkan stores vs what Mailtrap does

- **Etkan** — templates, compose UI, Sent history (`email_sent` + `email_users`), Ref. N/YYYY.
- **Mailtrap** — delivers each message after the server successfully hands it off (`MAILTRAP_FROM_EMAIL` on the verified domain).

Managers never paste an API key in the UI. Keys stay in server env vars.

**Important:** Mailtrap does not finish a half-done multi-recipient loop if the server stops mid-send. Use **Sent → Resend** for leftovers.

## Where managers work

Sidebar group **Email**:

| Page | Route |
|------|--------|
| Emailing | `/manager/emailing` |
| Full customization | `/manager/emailing/compose` |
| Sent | `/manager/sent` |
| Sent detail | `/manager/sent/[id]` |

No separate Admin emailing page in this version.

## Circular format

Every manager email is an **Etkan Administrative Circular** (no “Hi” / “مرحبا”):

```text
Ref.: {N}/{year}
Etkan Administrative Circular

{Title}

Dear Etkan Student,

{Body}

For additional information, students can contact:
asweid657@gmail.com

Ali Sweid
Etkan Administration
```

Arabic language mode uses Arabic chrome (تعميم إداري من إتقان، عزيزي طالب إتقان، إدارة إتقان، إلخ). Title/body stay as the manager typed them.

## Reference numbers

Each **new** send allocates the next year-scoped number:

- First circular in 2026 → `Ref.: 1/2026`
- Second → `Ref.: 2/2026`

Stored on `email_sent.reference_code`. Concurrent sends are locked so numbers do not collide.

**Resend** keeps the **same** Ref. and the same `email_sent` row; it only adds/updates recipients.

## Tracking tables

| Table | Purpose |
|-------|---------|
| `email_sent` | One row per circular (title, plain body snapshot, locale, template, created_by, reference) |
| `email_users` | One row per recipient address (profile id when known, delivery_status, sent_at, Mailtrap message id) |

Unique `(email_sent_id, email_address)`.

## The six templates

| Template | Use when |
|----------|----------|
| **Welcome** | Account credentials |
| **Announcement** | General notice |
| **Reminder** | Upcoming item / deadline |
| **Payment reminder** | Amount + due date |
| **Enrollment update** | Semester enrollment status |
| **Custom** | Free subject + message (dialog or Full customization) |

## How managers send

1. **Ready actions** — select users with email → Compose on a card (template pre-selected).
2. **Message / Send all** — Custom by default; change template in the dialog.
3. **Send custom email** — typed address only.
4. **Full customization** — Gmail-style To (search chips + bulk roles), subject, TipTap body; Arabic RTL / English LTR.

## What happens on Send

1. Validate form + manager role (client and server).
2. Allocate `Ref.: N/YYYY` and insert `email_sent`.
3. Build circular HTML (RTL if Arabic).
4. Call Mailtrap per recipient; upsert `email_users` as `sent` or `failed`.
5. Toast includes the reference code.

## Resend

From the **Sent** table, **Resend** opens a recipient picker (same To UX as Full customization). The circular body comes from the stored plain-text snapshot (TipTap formatting is not re-applied). Same Ref. is kept.

## Filters (Emailing users table)

Client-side: name, email, role, class (students enrolled + teachers assigned). Class dropdown shows the class **name**.

## From address and domain

`.env.local` (server only):

- `MAILTRAP_API_KEY`
- `MAILTRAP_FROM_EMAIL` — verified domain From
- `MAILTRAP_FROM_NAME`

Student contact line in the circular is always `asweid657@gmail.com` (not the From).

## Language

Compose **Language** defaults to Arabic (RTL) in the UI:

- **العربية (RTL)** — Arabic chrome + RTL layout / inputs  
- **English (LTR)** — English chrome + LTR  

Does not auto-translate content.

## Migration

Apply `supabase/migrations/20260728000000_email_sent_and_email_users.sql` (`npx supabase db push`) before sending so reference allocation works.

## Re-test Mailtrap only

```bash
npm run test:mailtrap
```

## Not automatic yet

- Auto-send Welcome on account create  
- Open-tracking into `opened_at`  
- Background send queue  
- RLS on email tables (app uses service/admin client)
