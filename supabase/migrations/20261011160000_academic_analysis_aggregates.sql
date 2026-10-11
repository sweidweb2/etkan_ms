-- Academic analysis dashboard: status counts, class session series, and a
-- paged student roster. Avoids loading every profile, class detail, and session
-- row, and does not touch Auth Admin emails.

create or replace function public.academic_analysis_student_counts()
returns table (
  active_count bigint,
  inactive_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (
      where sp.status is null
        or sp.status not in ('inactive', 'graduated', 'suspended')
    )::bigint as active_count,
    count(*) filter (where sp.status = 'inactive')::bigint as inactive_count,
    count(*)::bigint as total_count
  from public.student_profiles sp
  inner join public.profiles p on p.id = sp.user_id;
$$;

comment on function public.academic_analysis_student_counts() is
  'Active, inactive, and total students with a profile. Unknown status counts as active.';

revoke all on function public.academic_analysis_student_counts() from public;
revoke all on function public.academic_analysis_student_counts() from anon, authenticated;
grant execute on function public.academic_analysis_student_counts() to service_role;

create or replace function public.list_class_session_progress()
returns table (
  class_id uuid,
  class_name text,
  status text,
  actual_sessions bigint,
  planned_sessions integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as class_id,
    c.name as class_name,
    c.status,
    count(sess.id)::bigint as actual_sessions,
    coalesce(s.nb_sessions, 0)::integer as planned_sessions
  from public.classes c
  left join public.subjects s on s.id = c.subject_id
  left join public.sessions sess on sess.class_id = c.id
  group by c.id, c.name, c.status, s.nb_sessions
  order by c.name asc, c.id asc;
$$;

comment on function public.list_class_session_progress() is
  'One row per class: completed session count versus the subject planned count.';

revoke all on function public.list_class_session_progress() from public;
revoke all on function public.list_class_session_progress() from anon, authenticated;
grant execute on function public.list_class_session_progress() to service_role;

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
      p.username,
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
        or coalesce(p.username, '') ilike '%' || params.search_text || '%'
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
          'username', page.username,
          'status', page.status
        )
        order by page.full_name, page.id
      )
      from (
        select matched.id, matched.full_name, matched.username, matched.status
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
  'Paged academic-analysis roster (name, username, status). No auth emails.';

revoke all on function public.list_academic_analysis_students(text, text, integer, integer) from public;
revoke all on function public.list_academic_analysis_students(text, text, integer, integer) from anon, authenticated;
grant execute on function public.list_academic_analysis_students(text, text, integer, integer) to service_role;
