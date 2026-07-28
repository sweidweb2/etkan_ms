-- Administrative circular email tracking: email_sent + email_users.
-- Year-scoped reference numbers (e.g. 1/2026, 2/2026).

create table email_sent (
  id uuid primary key default gen_random_uuid(),
  reference_number integer not null,
  year integer not null,
  reference_code text not null,
  title text not null,
  body text not null,
  locale text not null default 'ar'
    check (locale in ('en', 'ar')),
  template_id text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, reference_number),
  unique (reference_code)
);

comment on table email_sent is
  'Administrative circular emails sent from the manager Emailing page.';

comment on column email_sent.reference_code is
  'Display reference, e.g. 5/2026 (year-scoped cumulative counter).';

comment on column email_sent.body is
  'Plain-text snapshot of the circular body content as sent.';

create index idx_email_sent_year on email_sent (year);
create index idx_email_sent_created_by on email_sent (created_by);
create index idx_email_sent_created_at on email_sent (created_at desc);

create table email_users (
  id uuid primary key default gen_random_uuid(),
  email_sent_id uuid not null references email_sent(id) on delete cascade,
  student_id uuid references profiles(id) on delete set null,
  email_address text not null,
  sent_at timestamptz,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  opened_at timestamptz,
  mailtrap_message_id text,
  created_at timestamptz not null default now(),
  unique (email_sent_id, email_address)
);

comment on table email_users is
  'Recipients of an administrative circular (one row per email address per circular).';

comment on column email_users.student_id is
  'profiles.id when the recipient is a known user; null for typed external addresses.';

comment on column email_users.opened_at is
  'Reserved for future open-tracking; unused until Mailtrap webhooks are wired.';

create index idx_email_users_email_sent_id on email_users (email_sent_id);
create index idx_email_users_student_id on email_users (student_id);
create index idx_email_users_email_address on email_users (email_address);

-- Atomically allocate the next year-scoped reference and insert the email_sent row.
create or replace function public.create_email_sent_with_reference(
  p_title text,
  p_body text,
  p_locale text,
  p_template_id text,
  p_created_by uuid,
  p_year integer default null
)
returns email_sent
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from timezone('utc', now()))::integer);
  v_next integer;
  v_row email_sent;
begin
  if p_locale not in ('en', 'ar') then
    raise exception 'locale must be en or ar';
  end if;

  -- Serialize allocations per year to avoid duplicate reference_number under concurrency.
  perform pg_advisory_xact_lock(hashtext('email_sent_ref_' || v_year::text));

  select coalesce(max(reference_number), 0) + 1
  into v_next
  from email_sent
  where year = v_year;

  insert into email_sent (
    reference_number,
    year,
    reference_code,
    title,
    body,
    locale,
    template_id,
    created_by
  )
  values (
    v_next,
    v_year,
    v_next::text || '/' || v_year::text,
    p_title,
    p_body,
    p_locale,
    p_template_id,
    p_created_by
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.create_email_sent_with_reference is
  'Inserts email_sent with the next Ref. N/YYYY for the given year (UTC year by default).';
