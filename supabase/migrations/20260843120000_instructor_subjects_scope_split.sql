-- Split the subject catalog into instructor and mentor scopes.
-- mentor_subjects/mentor_subject_capability stay for mentors; instructors get
-- their own catalog and capability matrix, seeded from the mentor data that was
-- previously written for instructors.

create table public.instructor_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create unique index instructor_subjects_name_lower_unique
  on public.instructor_subjects (lower(name));

create index idx_instructor_subjects_sort_order
  on public.instructor_subjects (sort_order);

comment on table public.instructor_subjects is
  'Instructor subject catalog for instructor capabilities (independent of mentor and academic subjects).';

create table public.instructor_subject_capability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  instructor_subject_id uuid not null references public.instructor_subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint instructor_subject_capability_user_subject_unique unique (user_id, instructor_subject_id)
);

comment on table public.instructor_subject_capability is
  'Instructor subjects an instructor is capable of teaching (eligibility, not class assignment).';

create index idx_instructor_subject_capability_user_id
  on public.instructor_subject_capability (user_id);

create index idx_instructor_subject_capability_instructor_subject_id
  on public.instructor_subject_capability (instructor_subject_id);

-- Data migration -------------------------------------------------------------

-- 1. Seed the instructor catalog from the mentor catalog.
insert into public.instructor_subjects (name, sort_order, created_at)
select m.name, m.sort_order, m.created_at
from public.mentor_subjects m;

-- 2. Copy capabilities of users who are instructors, mapping subject by name.
insert into public.instructor_subject_capability (user_id, instructor_subject_id, created_at)
select c.user_id, i.id, c.created_at
from public.mentor_subject_capability c
join public.mentor_subjects m on m.id = c.mentor_subject_id
join public.instructor_subjects i on lower(i.name) = lower(m.name)
join public.profiles p on p.id = c.user_id
where p.is_instructor
on conflict (user_id, instructor_subject_id) do nothing;

-- 3. Drop the copied rows unless the user is also a mentor (dual-role keeps both).
delete from public.mentor_subject_capability c
using public.profiles p
where p.id = c.user_id
  and p.is_instructor
  and not p.is_mentor;

-- RPCs ------------------------------------------------------------------------

create or replace function public.reorder_instructor_subjects(p_ordered_ids text[])
returns setof public.instructor_subjects
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

  select count(*)::integer into v_catalog_count from public.instructor_subjects;
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
  from public.instructor_subjects s
  where s.id in (select unnest(p_ordered_ids)::uuid);

  if v_matched_count <> v_catalog_count then
    raise exception 'ordered ids do not match the current catalog';
  end if;

  update public.instructor_subjects s
  set sort_order = o.ord - 1
  from unnest(p_ordered_ids) with ordinality as o(id, ord)
  where s.id = o.id::uuid;

  return query
  select *
  from public.instructor_subjects
  order by sort_order asc, created_at asc;
end;
$$;

comment on function public.reorder_instructor_subjects(text[]) is
  'Rewrite instructor_subjects.sort_order from ordered id list; returns rows in new order.';

create or replace function public.delete_instructor_subject_capability_pairs(
  p_user_ids text[],
  p_instructor_subject_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if p_user_ids is null or p_instructor_subject_ids is null then
    return 0;
  end if;

  if cardinality(p_user_ids) = 0 then
    return 0;
  end if;

  if cardinality(p_user_ids) <> cardinality(p_instructor_subject_ids) then
    raise exception 'user ids and instructor subject ids must have equal length';
  end if;

  with pairs as (
    select
      u.user_id::uuid as user_id,
      s.instructor_subject_id::uuid as instructor_subject_id
    from
      unnest(p_user_ids) with ordinality as u(user_id, ord),
      unnest(p_instructor_subject_ids) with ordinality as s(instructor_subject_id, ord)
    where u.ord = s.ord
  ),
  deleted as (
    delete from public.instructor_subject_capability c
    using pairs p
    where c.user_id = p.user_id
      and c.instructor_subject_id = p.instructor_subject_id
    returning c.id
  )
  select count(*)::integer into v_deleted from deleted;

  return v_deleted;
end;
$$;

comment on function public.delete_instructor_subject_capability_pairs(text[], text[]) is
  'Batch delete instructor_subject_capability rows by zipped (user_id, instructor_subject_id) pairs.';

-- Instructor teardown now clears the instructor capability table.
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
    delete from public.instructor_subject_capability
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
  'Clear instructor subject capabilities, workshop assignments, and instructor schedule slots for one user.';

create or replace function public.clear_mentor_related_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capabilities integer := 0;
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

  return jsonb_build_object('capabilities', v_capabilities);
end;
$$;

comment on function public.clear_mentor_related_data(uuid) is
  'Clear mentor subject capabilities for one user.';

grant execute on function public.reorder_instructor_subjects(text[]) to service_role;
grant execute on function public.delete_instructor_subject_capability_pairs(text[], text[]) to service_role;
grant execute on function public.clear_mentor_related_data(uuid) to service_role;
