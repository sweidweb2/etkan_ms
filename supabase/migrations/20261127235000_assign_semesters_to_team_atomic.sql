-- Atomic assign of semesters onto a team (locks column, allocates sort_order).

create or replace function public.assign_semesters_to_team(
  p_team_id uuid,
  p_semester_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_count integer;
  v_updated_count integer;
  v_start integer;
begin
  v_input_count := coalesce(cardinality(p_semester_ids), 0);
  if v_input_count = 0 then
    return;
  end if;

  if p_team_id is not null and not exists (
    select 1 from public.semester_teams where id = p_team_id
  ) then
    raise exception 'team not found';
  end if;

  -- Serialize assigns into the same column (null = unassigned).
  perform 1
  from public.semesters
  where team_id is not distinct from p_team_id
  for update;

  select coalesce(max(sort_order), -1) + 1
  into v_start
  from public.semesters
  where team_id is not distinct from p_team_id;

  with ordered as (
    select id, (ordinality - 1)::integer as offset
    from unnest(p_semester_ids) with ordinality as t(id, ordinality)
  ),
  updated as (
    update public.semesters s
    set
      team_id = p_team_id,
      sort_order = v_start + o.offset
    from ordered o
    where s.id = o.id
    returning s.id
  )
  select count(*)::integer into v_updated_count from updated;

  if v_updated_count <> v_input_count then
    raise exception
      'semester assign count mismatch: updated % of %',
      v_updated_count,
      v_input_count;
  end if;
end;
$$;

comment on function public.assign_semesters_to_team(uuid, uuid[]) is
  'Assign semesters to a team (or unassigned) with locked next sort_order allocation.';

revoke all on function public.assign_semesters_to_team(uuid, uuid[]) from public;
grant execute on function public.assign_semesters_to_team(uuid, uuid[]) to service_role;
