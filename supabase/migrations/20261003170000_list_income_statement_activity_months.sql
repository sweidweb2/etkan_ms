-- Distinct year/month keys with ledger activity (history picker; avoids full date pulls).

create or replace function public.list_income_statement_activity_months()
returns table (year integer, month integer)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    extract(year from activity_date)::integer as year,
    extract(month from activity_date)::integer as month
  from (
    select payment_date as activity_date
    from public.student_payments
    union all
    select effective_date
    from public.student_financial_adjustments
    union all
    select transaction_date
    from public.transactions
  ) activity
  where activity_date is not null
  order by 1 desc, 2 desc;
$$;

comment on function public.list_income_statement_activity_months() is
  'Distinct calendar months that have payments, adjustments, or transactions.';

revoke all on function public.list_income_statement_activity_months() from public;
revoke all on function public.list_income_statement_activity_months() from anon, authenticated;
grant execute on function public.list_income_statement_activity_months() to service_role;
