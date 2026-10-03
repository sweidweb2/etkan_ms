-- DB-side all-time SPP payment total for income statement (avoids PostgREST max_rows).

create or replace function public.sum_student_payment_amounts()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::numeric
  from public.student_payments;
$$;

comment on function public.sum_student_payment_amounts() is
  'All-time sum of student_payments.amount for income-statement totals.';

revoke all on function public.sum_student_payment_amounts() from public;
revoke all on function public.sum_student_payment_amounts() from anon, authenticated;
grant execute on function public.sum_student_payment_amounts() to service_role;
