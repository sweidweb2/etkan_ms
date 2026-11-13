-- Instructor capabilities point at academic subjects.
-- The separate instructor subject catalog and its capability rows are discarded.

truncate table public.instructor_subject_capability;

drop function if exists public.reorder_instructor_subjects(text[]);
drop function if exists public.delete_instructor_subject_capability_pairs(text[], text[]);

alter table public.instructor_subject_capability
  drop constraint if exists instructor_subject_capability_user_subject_unique;

drop index if exists public.idx_instructor_subject_capability_instructor_subject_id;

alter table public.instructor_subject_capability
  drop column instructor_subject_id;

drop table public.instructor_subjects;

alter table public.instructor_subject_capability
  add column subject_id uuid not null references public.subjects (id) on delete cascade;

alter table public.instructor_subject_capability
  add constraint instructor_subject_capability_user_subject_unique unique (user_id, subject_id);

create index idx_instructor_subject_capability_subject_id
  on public.instructor_subject_capability (subject_id);

comment on table public.instructor_subject_capability is
  'Academic subjects an instructor is capable of teaching (eligibility, not class assignment).';

create function public.delete_instructor_subject_capability_pairs(
  p_user_ids text[],
  p_subject_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if p_user_ids is null or p_subject_ids is null then
    return 0;
  end if;

  if cardinality(p_user_ids) = 0 then
    return 0;
  end if;

  if cardinality(p_user_ids) <> cardinality(p_subject_ids) then
    raise exception 'user ids and subject ids must have equal length';
  end if;

  with pairs as (
    select
      u.user_id::uuid as user_id,
      s.subject_id::uuid as subject_id
    from
      unnest(p_user_ids) with ordinality as u(user_id, ord),
      unnest(p_subject_ids) with ordinality as s(subject_id, ord)
    where u.ord = s.ord
  ),
  deleted as (
    delete from public.instructor_subject_capability c
    using pairs p
    where c.user_id = p.user_id
      and c.subject_id = p.subject_id
    returning c.id
  )
  select count(*)::integer into v_deleted from deleted;

  return v_deleted;
end;
$$;

comment on function public.delete_instructor_subject_capability_pairs(text[], text[]) is
  'Batch delete instructor_subject_capability rows by zipped (user_id, subject_id) pairs.';

grant execute on function public.delete_instructor_subject_capability_pairs(text[], text[]) to service_role;

update public.permissions
set label = 'Update instructor capabilities'
where key = 'instructors.capabilities.update';

-- Cascades to role_permissions.
delete from public.permissions
where key in (
  'instructors.subjects.create',
  'instructors.subjects.update',
  'instructors.subjects.delete'
);
