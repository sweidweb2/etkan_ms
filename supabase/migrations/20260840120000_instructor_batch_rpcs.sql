-- Batch RPCs for manage-instructors: reorder, capability pair delete, clear related.

create or replace function public.reorder_mentor_subjects(p_ordered_ids text[])
returns setof public.mentor_subjects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalog_count integer;
  v_input_count integer;
  v_matched_count integer;
begin
  if p_ordered_ids is null or cardinality(p_ordered_ids) = 0 then
    raise exception 'ordered ids required';
  end if;

  select count(*)::integer into v_catalog_count from public.mentor_subjects;
  v_input_count := cardinality(p_ordered_ids);

  if v_input_count <> v_catalog_count then
    raise exception 'ordered ids length (%) does not match catalog size (%)',
      v_input_count,
      v_catalog_count;
  end if;

  if (
    select count(distinct id)::integer
    from unnest(p_ordered_ids) as id
  ) <> v_input_count then
    raise exception 'ordered ids must be unique';
  end if;

  select count(*)::integer
  into v_matched_count
  from public.mentor_subjects m
  where m.id in (select unnest(p_ordered_ids)::uuid);

  if v_matched_count <> v_catalog_count then
    raise exception 'ordered ids do not match the current catalog';
  end if;

  update public.mentor_subjects m
  set sort_order = o.ord - 1
  from unnest(p_ordered_ids) with ordinality as o(id, ord)
  where m.id = o.id::uuid;

  return query
  select *
  from public.mentor_subjects
  order by sort_order asc, created_at asc;
end;
$$;

comment on function public.reorder_mentor_subjects(text[]) is
  'Rewrite mentor_subjects.sort_order from ordered id list; returns rows in new order.';

create or replace function public.delete_mentor_subject_capability_pairs(
  p_user_ids text[],
  p_mentor_subject_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if p_user_ids is null or p_mentor_subject_ids is null then
    return 0;
  end if;

  if cardinality(p_user_ids) = 0 then
    return 0;
  end if;

  if cardinality(p_user_ids) <> cardinality(p_mentor_subject_ids) then
    raise exception 'user ids and mentor subject ids must have equal length';
  end if;

  with pairs as (
    select
      u.user_id::uuid as user_id,
      s.mentor_subject_id::uuid as mentor_subject_id
    from
      unnest(p_user_ids) with ordinality as u(user_id, ord),
      unnest(p_mentor_subject_ids) with ordinality as s(mentor_subject_id, ord)
    where u.ord = s.ord
  ),
  deleted as (
    delete from public.mentor_subject_capability c
    using pairs p
    where c.user_id = p.user_id
      and c.mentor_subject_id = p.mentor_subject_id
    returning c.id
  )
  select count(*)::integer into v_deleted from deleted;

  return v_deleted;
end;
$$;

comment on function public.delete_mentor_subject_capability_pairs(text[], text[]) is
  'Batch delete mentor_subject_capability rows by zipped (user_id, mentor_subject_id) pairs.';

create or replace function public.clear_instructor_related_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capabilities integer := 0;
  v_workshop_instructors integer := 0;
  v_schedule_slots integer := 0;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  with deleted as (
    delete from public.mentor_subject_capability
    where user_id = p_user_id
    returning id
  )
  select count(*)::integer into v_capabilities from deleted;

  with deleted as (
    delete from public.workshop_instructors
    where user_id = p_user_id
    returning id
  )
  select count(*)::integer into v_workshop_instructors from deleted;

  with deleted as (
    delete from public.instructor_schedule_slots
    where entity_type = 'instructor'
      and record_id = p_user_id
    returning id
  )
  select count(*)::integer into v_schedule_slots from deleted;

  return jsonb_build_object(
    'capabilities', v_capabilities,
    'workshop_instructors', v_workshop_instructors,
    'schedule_slots', v_schedule_slots
  );
end;
$$;

comment on function public.clear_instructor_related_data(uuid) is
  'Clear mentor capabilities, workshop assignments, and instructor schedule slots for one user.';

grant execute on function public.reorder_mentor_subjects(text[]) to service_role;
grant execute on function public.delete_mentor_subject_capability_pairs(text[], text[]) to service_role;
grant execute on function public.clear_instructor_related_data(uuid) to service_role;
