-- Data integrity: atomic class-task deletes, attachment max-files race, board locks.

-- ---------------------------------------------------------------------------
-- 1) Delete class task + polymorphic attachments in one transaction.
--    student_tasks / student_task_uploads cascade from class_tasks.
--    task_attachments.entity_id is not an FK, so it must be deleted explicitly.
-- ---------------------------------------------------------------------------

create or replace function public.delete_class_task_with_attachments(
  p_class_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_class_task_id is null then
    raise exception 'class task id required';
  end if;

  if not exists (select 1 from public.class_tasks where id = p_class_task_id) then
    return;
  end if;

  delete from public.task_attachments
  where entity = 'class_task'
    and entity_id = p_class_task_id;

  delete from public.class_tasks
  where id = p_class_task_id;
end;
$$;

comment on function public.delete_class_task_with_attachments(uuid) is
  'Atomically delete a class_task (cascading student_tasks/uploads) and its task_attachments rows.';

revoke all on function public.delete_class_task_with_attachments(uuid) from public;
grant execute on function public.delete_class_task_with_attachments(uuid) to service_role;

create or replace function public.delete_class_tasks_for_class_with_attachments(
  p_class_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_class_id is null then
    raise exception 'class id required';
  end if;

  delete from public.task_attachments ta
  using public.class_tasks ct
  where ta.entity = 'class_task'
    and ta.entity_id = ct.id
    and ct.class_id = p_class_id;

  delete from public.class_tasks
  where class_id = p_class_id;
end;
$$;

comment on function public.delete_class_tasks_for_class_with_attachments(uuid) is
  'Atomically delete all class_tasks for a class plus their task_attachments rows.';

revoke all on function public.delete_class_tasks_for_class_with_attachments(uuid) from public;
grant execute on function public.delete_class_tasks_for_class_with_attachments(uuid) to service_role;

create or replace function public.delete_subject_task_with_attachments(
  p_subject_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_subject_task_id is null then
    raise exception 'subject task id required';
  end if;

  if not exists (select 1 from public.subject_tasks where id = p_subject_task_id) then
    return;
  end if;

  delete from public.task_attachments
  where entity = 'subject_task'
    and entity_id = p_subject_task_id;

  delete from public.subject_tasks
  where id = p_subject_task_id;
end;
$$;

comment on function public.delete_subject_task_with_attachments(uuid) is
  'Atomically delete a subject_task and its task_attachments rows.';

revoke all on function public.delete_subject_task_with_attachments(uuid) from public;
grant execute on function public.delete_subject_task_with_attachments(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2) Enforce max 10 attachments per entity under an advisory lock (closes race).
--    Cap + exception text must stay aligned with TASK_ATTACHMENT_MAX_FILES and
--    TASK_ATTACHMENT_MAX_FILES_SQL_MESSAGE in lib/constants.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_task_attachment_max_files()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  -- Keep in sync with TASK_ATTACHMENT_MAX_FILES (app constant).
  v_max_files constant integer := 10;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.entity || ':' || new.entity_id::text, 0)
  );

  select count(*)::integer
  into v_count
  from public.task_attachments
  where entity = new.entity
    and entity_id = new.entity_id;

  if v_count >= v_max_files then
    raise exception 'Each task can have at most 10 attachments.';
  end if;

  return new;
end;
$$;

drop trigger if exists task_attachments_enforce_max_files on public.task_attachments;

create trigger task_attachments_enforce_max_files
  before insert on public.task_attachments
  for each row
  execute function public.enforce_task_attachment_max_files();

comment on function public.enforce_task_attachment_max_files() is
  'Serialize inserts per (entity, entity_id) and reject when the task already has 10 attachments.';

-- ---------------------------------------------------------------------------
-- 3) Board position RPCs: lock rows before update (serialize vs assign/drag).
-- ---------------------------------------------------------------------------

create or replace function public.update_semester_board_positions(p_placements jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_count integer;
  v_updated_count integer;
  v_team_id uuid;
begin
  if p_placements is null or jsonb_typeof(p_placements) <> 'array' then
    raise exception 'placements array required';
  end if;

  v_input_count := jsonb_array_length(p_placements);

  -- Lock destination columns (incl. unassigned) then the moved semester rows.
  for v_team_id in
    select distinct nullif(elem->>'team_id', '')::uuid
    from jsonb_array_elements(p_placements) as elem
  loop
    if v_team_id is null then
      perform pg_advisory_xact_lock(hashtext('semesters:unassigned'));
    else
      perform 1 from public.semester_teams where id = v_team_id for update;
    end if;
  end loop;

  perform 1
  from public.semesters s
  where s.id in (
    select (elem->>'id')::uuid
    from jsonb_array_elements(p_placements) as elem
  )
  for update;

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

create or replace function public.update_subject_board_positions(p_placements jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input_count integer;
  v_updated_count integer;
  v_stage_id uuid;
begin
  if p_placements is null or jsonb_typeof(p_placements) <> 'array' then
    raise exception 'placements array required';
  end if;

  v_input_count := jsonb_array_length(p_placements);

  for v_stage_id in
    select distinct nullif(elem->>'stage_id', '')::uuid
    from jsonb_array_elements(p_placements) as elem
  loop
    if v_stage_id is null then
      perform pg_advisory_xact_lock(hashtext('subjects:unassigned'));
    else
      perform 1 from public.stages where id = v_stage_id for update;
    end if;
  end loop;

  perform 1
  from public.subjects s
  where s.id in (
    select (elem->>'id')::uuid
    from jsonb_array_elements(p_placements) as elem
  )
  for update;

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
