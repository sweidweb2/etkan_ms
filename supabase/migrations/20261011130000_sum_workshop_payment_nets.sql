-- Signed paid-net per workshop (credit minus debit) for the listed ids only.

create or replace function public.sum_workshop_payment_nets(p_workshop_ids uuid[])
returns table (workshop_id uuid, paid_net numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    workshop_payments.workshop_id,
    (
      coalesce(sum(amount) filter (where type = 'credit'), 0)
      - coalesce(sum(amount) filter (where type = 'debit'), 0)
    )::numeric as paid_net
  from public.workshop_payments
  where workshop_payments.workshop_id = any (p_workshop_ids)
  group by workshop_payments.workshop_id;
$$;

comment on function public.sum_workshop_payment_nets(uuid[]) is
  'Signed workshop payment net (credits minus debits) grouped by workshop id.';

revoke all on function public.sum_workshop_payment_nets(uuid[]) from public;
revoke all on function public.sum_workshop_payment_nets(uuid[]) from anon, authenticated;
grant execute on function public.sum_workshop_payment_nets(uuid[]) to service_role;
