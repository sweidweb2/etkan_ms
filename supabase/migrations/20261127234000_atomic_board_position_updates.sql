-- Atomic kanban board / column-order updates (single transaction per call).
-- Replaces N+1 client updates that could partially commit on failure.

create or replace function public.update_semester_board_positions(p_placements jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_count integer;
  v_updated_count integer;
begin
  if p_placements is null or jsonb_typeof(p_placements) <> 'array' then
    raise exception 'placements array required';
  end if;

  v_input_count := jsonb_array_length(p_placements);

  with placements as (
    select
      (elem->>'id')::uuid as id,
      (elem->>'team_id')::uuid as team_id,
      (elem->>'sort_order')::integer as sort_order
    from jsonb_array_elements(p_placements) as elem
  ),
  updated as (
    update public.semesters s
    set
      team_id = p.team_id,
      sort_order = p.sort_order
    from placements p
    where s.id = p.id
    returning s.id
  )
  select count(*)::integer into v_updated_count from updated;

  if v_updated_count <> v_input_count then
    raise exception
      'semester placement count mismatch: updated % of %',
      v_updated_count,
      v_input_count;
  end if;
end;
$$;

comment on function public.update_semester_board_positions(jsonb) is
  'Batch-update semesters.team_id + sort_order from a placements JSON array.';

revoke all on function public.update_semester_board_positions(jsonb) from public;
grant execute on function public.update_semester_board_positions(jsonb) to service_role;

create or replace function public.update_semester_team_sort_orders(p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog_count integer;
  v_input_count integer;
  v_updated_count integer;
begin
  v_input_count := coalesce(cardinality(p_ordered_ids), 0);

  select count(*)::integer into v_catalog_count from public.semester_teams;

  if v_input_count <> v_catalog_count then
    raise exception
      'ordered team ids length (%) does not match catalog size (%)',
      v_input_count,
      v_catalog_count;
  end if;

  if v_input_count = 0 then
    return;
  end if;

  with ordered as (
    select id, (ordinality - 1)::integer as sort_order
    from unnest(p_ordered_ids) with ordinality as t(id, ordinality)
  ),
  updated as (
    update public.semester_teams st
    set sort_order = o.sort_order
    from ordered o
    where st.id = o.id
    returning st.id
  )
  select count(*)::integer into v_updated_count from updated;

  if v_updated_count <> v_input_count then
    raise exception
      'ordered team ids must be a full permutation of existing teams (updated % of %)',
      v_updated_count,
      v_input_count;
  end if;
end;
$$;

comment on function public.update_semester_team_sort_orders(uuid[]) is
  'Rewrite semester_teams.sort_order from a full ordered id list in one transaction.';

revoke all on function public.update_semester_team_sort_orders(uuid[]) from public;
grant execute on function public.update_semester_team_sort_orders(uuid[]) to service_role;

create or replace function public.update_subject_board_positions(p_placements jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_count integer;
  v_updated_count integer;
begin
  if p_placements is null or jsonb_typeof(p_placements) <> 'array' then
    raise exception 'placements array required';
  end if;

  v_input_count := jsonb_array_length(p_placements);

  with placements as (
    select
      (elem->>'id')::uuid as id,
      (elem->>'stage_id')::uuid as stage_id,
      (elem->>'sort_order')::integer as sort_order
    from jsonb_array_elements(p_placements) as elem
  ),
  updated as (
    update public.subjects s
    set
      stage_id = p.stage_id,
      sort_order = p.sort_order
    from placements p
    where s.id = p.id
    returning s.id
  )
  select count(*)::integer into v_updated_count from updated;

  if v_updated_count <> v_input_count then
    raise exception
      'subject placement count mismatch: updated % of %',
      v_updated_count,
      v_input_count;
  end if;
end;
$$;

comment on function public.update_subject_board_positions(jsonb) is
  'Batch-update subjects.stage_id + sort_order from a placements JSON array.';

revoke all on function public.update_subject_board_positions(jsonb) from public;
grant execute on function public.update_subject_board_positions(jsonb) to service_role;

create or replace function public.update_stage_sort_orders(p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog_count integer;
  v_input_count integer;
  v_updated_count integer;
begin
  v_input_count := coalesce(cardinality(p_ordered_ids), 0);

  select count(*)::integer into v_catalog_count from public.stages;

  if v_input_count <> v_catalog_count then
    raise exception
      'ordered stage ids length (%) does not match catalog size (%)',
      v_input_count,
      v_catalog_count;
  end if;

  if v_input_count = 0 then
    return;
  end if;

  with ordered as (
    select id, (ordinality - 1)::integer as sort_order
    from unnest(p_ordered_ids) with ordinality as t(id, ordinality)
  ),
  updated as (
    update public.stages s
    set sort_order = o.sort_order
    from ordered o
    where s.id = o.id
    returning s.id
  )
  select count(*)::integer into v_updated_count from updated;

  if v_updated_count <> v_input_count then
    raise exception
      'ordered stage ids must be a full permutation of existing stages (updated % of %)',
      v_updated_count,
      v_input_count;
  end if;
end;
$$;

comment on function public.update_stage_sort_orders(uuid[]) is
  'Rewrite stages.sort_order from a full ordered id list in one transaction.';

revoke all on function public.update_stage_sort_orders(uuid[]) from public;
grant execute on function public.update_stage_sort_orders(uuid[]) to service_role;
