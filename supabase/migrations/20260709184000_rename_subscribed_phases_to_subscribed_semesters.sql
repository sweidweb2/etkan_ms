-- Rename subscribed_phases → subscribed_semesters (billing enrollment per semester)
-- Idempotent: no-op when initial migration already defines subscribed_semesters.

do $$
begin
  if to_regclass('public.subscribed_phases') is not null then
    alter table subscribed_phases rename to subscribed_semesters;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payments'
      and column_name = 'subscribed_phase_id'
  ) then
    alter table payments
      rename column subscribed_phase_id to subscribed_semester_id;
  end if;
end $$;

do $$
begin
  if to_regclass('public.idx_subscribed_phases_semester_id') is not null then
    alter index idx_subscribed_phases_semester_id
      rename to idx_subscribed_semesters_semester_id;
  end if;
end $$;

do $$
begin
  if to_regclass('public.idx_payments_subscription') is not null then
    alter index idx_payments_subscription
      rename to idx_payments_subscribed_semester_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payments_subscribed_phase_id_fkey'
  ) then
    alter table payments
      rename constraint payments_subscribed_phase_id_fkey
      to payments_subscribed_semester_id_fkey;
  end if;
end $$;

comment on table subscribed_semesters is
    'Student account subscription to a semester for billing.';
