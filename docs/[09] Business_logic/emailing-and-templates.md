# Emailing and templates

This page explains how manager emailing works in Etkan MS, in plain language.

## What Etkan stores vs what Mailtrap does

- **Etkan (this app)** stores the circular **templates**, compose/send UI, and a send history in the database (`email_sent` + `email_users`).
- **Mailtrap** delivers each message from your verified domain (`etkan.org`) using `MAILTRAP_FROM_EMAIL` (for example `noreply@etkan.org`).

Managers never paste an API key into the UI. Keys stay in server environment variables.

## Where managers send from

Use **Manager → Emailing** (`/manager/emailing`).

There is no separate Admin emailing page in this version.

## Circular format

Every manager email is an **Etkan Administrative Circular**. Layout (no “Hi” / “مرحبا” greeting):

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

Arabic language mode uses the same structure with Arabic chrome (تعميم إداري من إتقان، عزيزي طالب إتقان، إدارة إتقان، إلخ). Title and body stay exactly as typed by the manager.

## Reference numbers

Each send gets the next year-scoped number from the database:

- First circular in 2026 → `Ref.: 1/2026`
- Second → `Ref.: 2/2026`

Stored on `email_sent.reference_code`. Concurrent sends are serialized so numbers do not collide.

## Tracking tables

| Table | Purpose |
|---|---|
| `email_sent` | One row per circular (title, body snapshot, locale, template, created_by, reference) |
| `email_users` | One row per recipient address (student_id when known, delivery_status, sent_at, optional Mailtrap message id) |

Unique `(email_sent_id, email_address)` prevents duplicate recipient rows for the same circular.

A manager history UI (list circulars / search by student) is planned later; data is already written on send.

## The six templates

| Template | Use it when |
|---|---|
| **Welcome** | Account credentials (email, username, temporary password) |
| **Announcement** | General notice |
| **Reminder** | Upcoming item or deadline |
| **Payment reminder** | Payment amount and due date |
| **Enrollment update** | Semester enrollment status |
| **Custom** | Free subject + message |

All use the circular shell above. Template-specific fields appear in the body section under the salutation.

## How a template is chosen

1. **Ready actions** — select users with email, then **Compose** on a card (template pre-selected).
2. **Message** / **Send all** — opens **Custom** by default; you can change template.
3. **Send custom email** (top of page) — type any address; Custom template, no user selection.

## What happens when you click Send

1. Validate form and manager role.
2. Allocate `Ref.: N/YYYY` and insert `email_sent`.
3. Build circular HTML (RTL if Arabic).
4. Send via Mailtrap to each recipient; upsert `email_users` with `sent` or `failed`.
5. Toast includes the reference code (e.g. `Ref.: 3/2026`).

## From address and domain

Set these in `.env.local` (server only):

- `MAILTRAP_API_KEY`
- `MAILTRAP_FROM_EMAIL` — verified domain address used as From
- `MAILTRAP_FROM_NAME`

The circular’s contact line for students is always `asweid657@gmail.com` (not the From address).

## Language

Compose **Language** defaults to Arabic (RTL):

- **العربية (RTL)** — Arabic chrome + RTL layout
- **English (LTR)** — English chrome + LTR layout

Does not auto-translate title/body — type Arabic (or English) content yourself.

## Migration note

Apply `supabase/migrations/20260728000000_email_sent_and_email_users.sql` with `npx supabase db push` (or your usual migration flow) before sending, so reference allocation works.

## How to re-test Mailtrap only

```bash
npm run test:mailtrap
```

## Not automatic yet

- Auto-send Welcome on account create (phase 2)
- Manager UI to browse circular history / search by student
- Open-tracking into `opened_at`
