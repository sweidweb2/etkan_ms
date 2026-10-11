-- Workshop payments overview totals (avoids PostgREST max_rows on amount/workshop_id pulls).

create or replace function public.aggregate_workshop_payment_totals()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'credits', coalesce(sum(amount) filter (where type = 'credit'), 0),
    'debits', coalesce(sum(amount) filter (where type = 'debit'), 0),
    'payment_count', count(*),
    'workshops_with_payments', count(distinct workshop_id)
  )
  from public.workshop_payments;
$$;

comment on function public.aggregate_workshop_payment_totals() is
  'All-time workshop payment credits, debits, count, and distinct workshops.';

revoke all on function public.aggregate_workshop_payment_totals() from public;
revoke all on function public.aggregate_workshop_payment_totals() from anon, authenticated;
grant execute on function public.aggregate_workshop_payment_totals() to service_role;
