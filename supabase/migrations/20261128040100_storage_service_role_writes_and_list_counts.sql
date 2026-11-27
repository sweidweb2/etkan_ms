-- 1) Storage: drop authenticated write policies (gallery/avatars pattern).
--    Public read stays; mutations go through the service-role admin client.
-- 2) List pages: one GROUP BY RPC per entity instead of N head:true counts.

--------------------------------------------------
-- 1) Storage service-role-only writes
--------------------------------------------------

drop policy if exists "Authenticated insert workshops documents" on storage.objects;
drop policy if exists "Authenticated update workshops documents" on storage.objects;
drop policy if exists "Authenticated delete workshops documents" on storage.objects;

drop policy if exists "Authenticated insert blogs images" on storage.objects;
drop policy if exists "Authenticated update blogs images" on storage.objects;
drop policy if exists "Authenticated delete blogs images" on storage.objects;

drop policy if exists "Authenticated insert auther images" on storage.objects;
drop policy if exists "Authenticated update auther images" on storage.objects;
drop policy if exists "Authenticated delete auther images" on storage.objects;

drop policy if exists "Authenticated insert projects images" on storage.objects;
drop policy if exists "Authenticated update projects images" on storage.objects;
drop policy if exists "Authenticated delete projects images" on storage.objects;

--------------------------------------------------
-- 2) List status/type counts (single round-trip)
--------------------------------------------------

create or replace function public.count_student_profiles_by_status()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total', (select count(*)::int from public.student_profiles),
    'by_status', coalesce(
      (
        select json_object_agg(status, cnt)
        from (
          select status::text as status, count(*)::int as cnt
          from public.student_profiles
          group by status
        ) grouped
      ),
      '{}'::json
    )
  );
$$;

comment on function public.count_student_profiles_by_status() is
  'Total student_profiles plus per-status counts in one round-trip.';

revoke all on function public.count_student_profiles_by_status() from public;
revoke all on function public.count_student_profiles_by_status() from anon, authenticated;
grant execute on function public.count_student_profiles_by_status() to service_role;

create or replace function public.count_classes_by_status()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select json_object_agg(status, cnt)
      from (
        select status::text as status, count(*)::int as cnt
        from public.classes
        group by status
      ) grouped
    ),
    '{}'::json
  );
$$;

comment on function public.count_classes_by_status() is
  'Per-status class counts in one round-trip.';

revoke all on function public.count_classes_by_status() from public;
revoke all on function public.count_classes_by_status() from anon, authenticated;
grant execute on function public.count_classes_by_status() to service_role;

create or replace function public.count_workshops_by_type(p_ids uuid[] default null)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select json_object_agg(type, cnt)
      from (
        select type::text as type, count(*)::int as cnt
        from public.workshops
        where p_ids is null or id = any (p_ids)
        group by type
      ) grouped
    ),
    '{}'::json
  );
$$;

comment on function public.count_workshops_by_type(uuid[]) is
  'Per-type workshop counts in one round-trip (optional id filter).';

revoke all on function public.count_workshops_by_type(uuid[]) from public;
revoke all on function public.count_workshops_by_type(uuid[]) from anon, authenticated;
grant execute on function public.count_workshops_by_type(uuid[]) to service_role;
