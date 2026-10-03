-- Monthly cron (Lebanon midnight on the 1st): record previous month's available
-- money as an opening_balance transaction dated the 1st of the new month.

create extension if not exists pg_cron with schema pg_catalog;

alter table public.transactions
  drop constraint if exists transactions_amount_positive;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_amount_non_negative'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_amount_non_negative check (amount >= 0);
  end if;
end $$;

comment on constraint transactions_amount_non_negative on public.transactions is
  'Amount is always non-negative; type distinguishes credit vs debit. Zero allowed for opening_balance carry-forward.';

create or replace function public.record_monthly_opening_balance(
  p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_beirut_now timestamp without time zone := timezone('Asia/Beirut', now());
  v_beirut_today date := v_beirut_now::date;
  v_opening_date date;
  v_prev_start date;
  v_prev_end_exclusive date;
  v_payments numeric(12, 2);
  v_credits numeric(12, 2);
  v_debits numeric(12, 2);
  v_available numeric(12, 2);
  v_amount numeric(10, 2);
  v_type text;
  v_prev_label text;
  v_exists boolean;
begin
  -- Cover Asia/Beirut UTC+2 / UTC+3; only one slot matches local midnight.
  if not p_force then
    if extract(day from v_beirut_today) <> 1
       or extract(hour from v_beirut_now) <> 0 then
      return 0;
    end if;
  end if;

  v_opening_date := date_trunc('month', v_beirut_today)::date;
  v_prev_end_exclusive := v_opening_date;
  v_prev_start := (v_opening_date - interval '1 month')::date;
  v_prev_label := trim(to_char(v_prev_start, 'FMMonth YYYY'));

  select exists (
    select 1
    from public.transactions t
    where t.category = 'opening_balance'
      and t.transaction_date = v_opening_date
  )
  into v_exists;

  if v_exists then
    return 0;
  end if;

  select coalesce(sum(sp.amount), 0)
  into v_payments
  from public.student_payments sp
  where sp.payment_date >= v_prev_start
    and sp.payment_date < v_prev_end_exclusive;

  select
    coalesce(sum(t.amount) filter (where t.type = 'credit'), 0),
    coalesce(sum(t.amount) filter (where t.type = 'debit'), 0)
  into v_credits, v_debits
  from public.transactions t
  where t.transaction_date >= v_prev_start
    and t.transaction_date < v_prev_end_exclusive;

  v_available := v_payments + v_credits - v_debits;

  if v_available < 0 then
    v_type := 'debit';
    v_amount := abs(v_available);
  else
    v_type := 'credit';
    v_amount := v_available;
  end if;

  insert into public.transactions (
    transaction_date,
    type,
    amount,
    description,
    category,
    payment_method,
    recorded_by,
    notes
  ) values (
    v_opening_date,
    v_type,
    v_amount,
    'Opening balance from ' || v_prev_label,
    'opening_balance',
    'other',
    'System',
    'auto_opening_balance'
  );

  insert into public.notifications (
    recipient_id,
    audience,
    category,
    priority,
    title,
    body,
    action_href,
    created_by,
    suppress_live_toast
  ) values (
    null,
    'manager',
    'billing',
    'normal',
    'Opening balance recorded',
    'Opening balance from '
      || v_prev_label
      || ' ('
      || v_type
      || ' '
      || to_char(v_amount, 'FM999999990.00')
      || ') was recorded for '
      || to_char(v_opening_date, 'YYYY-MM-DD')
      || '.',
    '/manager/income-statement',
    null,
    true
  );

  return 1;
end;
$$;

comment on function public.record_monthly_opening_balance(boolean) is
  'On the 1st at Asia/Beirut midnight: insert one opening_balance transaction for previous-month available money (payments + credits - debits), and a manager inbox notification. Pass true to bypass the calendar gate for manual runs.';

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'record-monthly-opening-balance'
  ) then
    perform cron.schedule(
      'record-monthly-opening-balance',
      '0 21,22 * * *',
      $cron$ select public.record_monthly_opening_balance(); $cron$
    );
  end if;
end $$;
