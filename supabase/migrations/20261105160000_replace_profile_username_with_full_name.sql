-- Replace profiles.username with profiles.full_name.
-- 1) Add + backfill profiles.full_name (student name > auth metadata > username > email prefix).
-- 2) Keep profiles.full_name in sync with student_profiles.full_name.
-- 3) Rewrite SQL functions that read profiles.username.
-- 4) Drop profiles.username and the username key from auth user metadata.

--------------------------------------------------
-- 1) profiles.full_name
--------------------------------------------------

alter table public.profiles add column if not exists full_name text;

update public.profiles p
set full_name = coalesce(
  nullif(btrim(sp.full_name), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(btrim(p.username), ''),
  nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
  'User'
)
from auth.users u
left join public.student_profiles sp on sp.user_id = u.id
where u.id = p.id
  and (p.full_name is null or btrim(p.full_name) = '');

update public.profiles
set full_name = 'User'
where full_name is null or btrim(full_name) = '';

alter table public.profiles alter column full_name set not null;

alter table public.profiles
  add constraint profiles_full_name_not_blank check (btrim(full_name) <> '');

create index if not exists profiles_full_name_idx on public.profiles (full_name);

comment on column public.profiles.full_name is
  'Display name for every user. Mirrors student_profiles.full_name for students.';

--------------------------------------------------
-- 2) Sync from student_profiles
--------------------------------------------------

create or replace function public.sync_profile_full_name_from_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_name is not null and btrim(new.full_name) <> '' then
    update public.profiles
    set full_name = btrim(new.full_name)
    where id = new.user_id
      and full_name is distinct from btrim(new.full_name);
  end if;

  return new;
end;
$$;

drop trigger if exists student_profiles_sync_profile_full_name on public.student_profiles;

create trigger student_profiles_sync_profile_full_name
after insert or update of full_name, user_id on public.student_profiles
for each row
execute function public.sync_profile_full_name_from_student_profile();

revoke all on function public.sync_profile_full_name_from_student_profile() from public;
revoke all on function public.sync_profile_full_name_from_student_profile() from anon, authenticated;

--------------------------------------------------
-- 3) Functions that read profiles.username
--------------------------------------------------

drop function if exists public.list_open_spps_missing_prior_adjustment(uuid[]);

create function public.list_open_spps_missing_prior_adjustment(
  p_phase_ids uuid[]
)
returns table (
  spp_id uuid,
  student_id uuid,
  payment_phase_id uuid,
  spp_status text,
  student_profile_id uuid,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    spp.id,
    spp.student_id,
    spp.payment_phase_id,
    spp.status::text,
    sp.id,
    coalesce(sp.full_name, p.full_name)
  from public.student_payment_phases spp
  left join public.student_profiles sp on sp.user_id = spp.student_id
  left join public.profiles p on p.id = spp.student_id
  where spp.payment_phase_id = any (p_phase_ids)
    and spp.status <> 'cancelled'
    and not exists (
      select 1
      from public.student_financial_adjustments own
      where own.student_payment_phase_id = spp.id
    )
    and exists (
      select 1
      from public.student_financial_adjustments prior
      join public.student_payment_phases other
        on other.id = prior.student_payment_phase_id
      where other.student_id = spp.student_id
        and other.id <> spp.id
    );
$$;

comment on function public.list_open_spps_missing_prior_adjustment(uuid[]) is
  'Non-cancelled SPPs on the given phases with no adjustment, where the student has an adjustment on another SPP.';

revoke all on function public.list_open_spps_missing_prior_adjustment(uuid[]) from public;
revoke all on function public.list_open_spps_missing_prior_adjustment(uuid[]) from anon, authenticated;
grant execute on function public.list_open_spps_missing_prior_adjustment(uuid[]) to service_role;

create or replace function public.list_academic_analysis_students(
  p_status text default null,
  p_search text default null,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select
      case
        when btrim(coalesce(p_status, '')) in (
          'active', 'inactive', 'graduated', 'suspended'
        )
          then btrim(p_status)
        else null
      end as status_filter,
      nullif(
        left(
          replace(
            replace(btrim(coalesce(p_search, '')), '%', ''),
            '_',
            ''
          ),
          80
        ),
        ''
      ) as search_text,
      least(greatest(coalesce(p_limit, 10), 1), 100) as lim,
      greatest(coalesce(p_offset, 0), 0) as requested_off
  ),
  matched as (
    select
      sp.id,
      sp.full_name,
      case
        when sp.status in ('active', 'inactive', 'graduated', 'suspended')
          then sp.status
        else 'active'
      end as status
    from public.student_profiles sp
    inner join public.profiles p on p.id = sp.user_id
    cross join params
    where
      (
        params.status_filter is null
        or (
          case
            when sp.status in ('active', 'inactive', 'graduated', 'suspended')
              then sp.status
            else 'active'
          end
        ) = params.status_filter
      )
      and (
        params.search_text is null
        or sp.full_name ilike '%' || params.search_text || '%'
      )
  ),
  clamped as (
    select
      (select count(*) from matched)::bigint as total,
      params.lim,
      case
        when (select count(*) from matched) = 0 then 0::bigint
        else least(
          params.requested_off::bigint,
          (
            ((select count(*) from matched) - 1) / params.lim
          ) * params.lim
        )
      end as off
    from params
  )
  select jsonb_build_object(
    'total', clamped.total,
    'page', (clamped.off / clamped.lim) + 1,
    'page_size', clamped.lim,
    'students', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'full_name', page.full_name,
          'status', page.status
        )
        order by page.full_name, page.id
      )
      from (
        select matched.id, matched.full_name, matched.status
        from matched
        order by matched.full_name asc, matched.id asc
        limit (select lim from clamped)
        offset (select off from clamped)
      ) page
    ), '[]'::jsonb)
  )
  from clamped;
$$;

comment on function public.list_academic_analysis_students(text, text, integer, integer) is
  'Paged academic-analysis roster (name, status). No auth emails.';

revoke all on function public.list_academic_analysis_students(text, text, integer, integer) from public;
revoke all on function public.list_academic_analysis_students(text, text, integer, integer) from anon, authenticated;
grant execute on function public.list_academic_analysis_students(text, text, integer, integer) to service_role;

--------------------------------------------------
-- 4) Drop username
--------------------------------------------------

alter table public.profiles drop column if exists username;

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'username'
where raw_user_meta_data ? 'username';
