-- Remove all manager accounting / student billing tables.
-- Historical migrations that created these tables are left intact;
-- this forward migration drops the feature schema.

drop table if exists public.payments cascade;
drop table if exists public.scheduled_payments cascade;
drop table if exists public.account_special_cases cascade;
drop table if exists public.subscribed_semesters cascade;
drop table if exists public.accounts cascade;
