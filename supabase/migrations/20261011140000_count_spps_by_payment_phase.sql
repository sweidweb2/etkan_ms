-- Per-phase SPP counts for the accounting list (avoids PostgREST max_rows).

create or replace function public.count_spps_by_payment_phase(p_phase_ids uuid[])
returns table (
  payment_phase_id uuid,
  active_count bigint,
  paid_count bigint,
  upfront_paid_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    spp.payment_phase_id,
    count(*) filter (where spp.status <> 'cancelled')::bigint as active_count,
    count(*) filter (where spp.status = 'paid')::bigint as paid_count,
    count(*) filter (
      where spp.status <> 'cancelled'
        and (
          spp.status = 'paid'
          or spp.total_paid >= pp.upfront_amount
        )
    )::bigint as upfront_paid_count
  from public.student_payment_phases spp
  join public.payment_phases pp on pp.id = spp.payment_phase_id
  where spp.payment_phase_id = any (p_phase_ids)
  group by spp.payment_phase_id;
$$;

comment on function public.count_spps_by_payment_phase(uuid[]) is
  'Active, fully paid, and upfront-paid student payment phase counts per phase.';

revoke all on function public.count_spps_by_payment_phase(uuid[]) from public;
revoke all on function public.count_spps_by_payment_phase(uuid[]) from anon, authenticated;
grant execute on function public.count_spps_by_payment_phase(uuid[]) to service_role;
