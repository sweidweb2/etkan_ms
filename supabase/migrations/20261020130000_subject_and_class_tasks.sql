-- Subject-level tasks + class-level tasks replacing session-scoped public.tasks.
-- Preserves task ids so student_tasks.task_id (and uploads) stay valid.

--------------------------------------------------
-- Guard: unclean orphans with student work
--------------------------------------------------

do $$
declare
  orphan_with_work integer;
begin
  select count(*)::integer into orphan_with_work
  from public.tasks t
  where t.session_id is null
    and exists (
      select 1 from public.student_tasks st where st.task_id = t.id
    );

  if orphan_with_work > 0 then
    raise exception
      'Cannot migrate tasks: % orphan task(s) have student_tasks and null session_id. Fix data before migrating.',
      orphan_with_work;
  end if;
end $$;

delete from public.tasks t
where t.session_id is null
  and not exists (
    select 1 from public.student_tasks st where st.task_id = t.id
  );

--------------------------------------------------
-- subject_tasks
--------------------------------------------------

create table public.subject_tasks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null,
  description text,
  period integer not null,
  max_grade numeric(5, 2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_tasks_title_not_blank_check check (trim(title) <> ''),
  constraint subject_tasks_period_positive_check check (period > 0)
);

create index subject_tasks_subject_id_idx
  on public.subject_tasks (subject_id);

create index subject_tasks_subject_sort_idx
  on public.subject_tasks (subject_id, sort_order);

comment on table public.subject_tasks is
  'Curriculum tasks for a subject. Cloned onto classes; later edits do not sync.';

comment on column public.subject_tasks.period is
  'Deadline length in whole days when a class task is started.';

--------------------------------------------------
-- class_tasks
--------------------------------------------------

create table public.class_tasks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  source_subject_task_id uuid references public.subject_tasks (id) on delete set null,
  title text not null,
  description text,
  period integer not null,
  max_grade numeric(5, 2),
  sort_order integer not null default 0,
  started boolean not null default false,
  started_at timestamptz,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_tasks_title_not_blank_check check (trim(title) <> ''),
  constraint class_tasks_period_positive_check check (period > 0),
  constraint class_tasks_started_due_date_check check (
    (started = false and started_at is null and due_date is null)
    or (started = true and started_at is not null and due_date is not null)
  )
);

create index class_tasks_class_id_idx
  on public.class_tasks (class_id);

create index class_tasks_class_sort_idx
  on public.class_tasks (class_id, sort_order);

create index class_tasks_source_subject_task_id_idx
  on public.class_tasks (source_subject_task_id);

comment on table public.class_tasks is
  'Live graded tasks for a class (cloned from subject_tasks or created ad hoc).';

comment on column public.class_tasks.source_subject_task_id is
  'Provenance only; null for ad-hoc class tasks. ON DELETE SET NULL.';

comment on column public.class_tasks.period is
  'Deadline length in whole days applied when the task is started.';

comment on column public.class_tasks.started is
  'When false, due_date is null and students cannot submit.';

--------------------------------------------------
-- Migrate session tasks → class_tasks (same ids)
--------------------------------------------------

insert into public.class_tasks (
  id,
  class_id,
  source_subject_task_id,
  title,
  description,
  period,
  max_grade,
  sort_order,
  started,
  started_at,
  due_date,
  created_at,
  updated_at
)
select
  t.id,
  s.class_id,
  null,
  t.title,
  t.description,
  case
    when t.due_date is not null and t.created_at is not null
      then greatest(
        1,
        ceil(
          extract(
            epoch from (t.due_date::timestamptz - t.created_at::timestamptz)
          ) / 86400.0
        )::integer
      )
    else 7
  end,
  t.max_grade,
  (
    dense_rank() over (
      partition by s.class_id
      order by t.created_at nulls last, t.id
    ) - 1
  )::integer,
  t.due_date is not null,
  case
    when t.due_date is not null then coalesce(t.created_at::timestamptz, now())
    else null
  end,
  case
    when t.due_date is not null then t.due_date::timestamptz
    else null
  end,
  coalesce(t.created_at::timestamptz, now()),
  now()
from public.tasks t
join public.sessions s on s.id = t.session_id;

--------------------------------------------------
-- Retarget student_tasks FK
--------------------------------------------------

alter table public.student_tasks
  drop constraint if exists student_tasks_task_id_fkey;

alter table public.student_tasks
  add constraint student_tasks_task_id_fkey
  foreign key (task_id) references public.class_tasks (id) on delete cascade;

drop index if exists public.idx_tasks_session;
drop table public.tasks;

--------------------------------------------------
-- RPCs: late join / new task / overdue
--------------------------------------------------

create or replace function public.seed_late_join_student_tasks(
  p_class_id uuid,
  p_student_id uuid
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.student_tasks (
      task_id,
      student_id,
      status,
      grade,
      notes
    )
    select
      t.id,
      p_student_id,
      case
        when t.due_date is not null and t.due_date < now() then 'missing'
        else 'pending'
      end,
      case
        when t.due_date is not null and t.due_date < now() then 0
        else null
      end,
      case
        when t.due_date is not null and t.due_date < now() then 'he entered late to this class'
        else null
      end
    from public.class_tasks t
    where t.class_id = p_class_id
    on conflict (task_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.seed_late_join_student_tasks(uuid, uuid) is
  'Idempotent: student_task rows for class_tasks. Past-due → missing + grade 0 + late note.';

create or replace function public.seed_late_join_student_tasks_for_students(
  p_class_id uuid,
  p_student_ids text[]
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.student_tasks (
      task_id,
      student_id,
      status,
      grade,
      notes
    )
    select
      t.id,
      student_id::uuid,
      case
        when t.due_date is not null and t.due_date < now() then 'missing'
        else 'pending'
      end,
      case
        when t.due_date is not null and t.due_date < now() then 0
        else null
      end,
      case
        when t.due_date is not null and t.due_date < now() then 'he entered late to this class'
        else null
      end
    from unnest(coalesce(p_student_ids, array[]::text[])) as student_id
    cross join public.class_tasks t
    where t.class_id = p_class_id
    on conflict (task_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.seed_late_join_student_tasks_for_students(uuid, text[]) is
  'Batch late-join student_tasks for class_tasks. Past-due → missing + grade 0 + late note.';

create or replace function public.seed_student_tasks_for_new_task(
  p_task_id uuid
)
returns setof public.student_tasks
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_tasks (task_id, student_id, status)
  select
    p_task_id,
    sc.user_id,
    'pending'
  from public.class_tasks t
  join public.student_class sc on sc.class_id = t.class_id
  where t.id = p_task_id
  on conflict (task_id, student_id) do nothing;

  return query
    select *
    from public.student_tasks
    where task_id = p_task_id;
end;
$$;

comment on function public.seed_student_tasks_for_new_task(uuid) is
  'Insert pending student_tasks for current class members of the class_task. ON CONFLICT DO NOTHING.';

create or replace function public.mark_overdue_pending_work_missing()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update student_tasks st
  set status = 'missing',
      grade = 0
  from class_tasks t
  where st.task_id = t.id
    and st.status = 'pending'
    and t.due_date is not null
    and t.due_date < now();

  update student_finalexam_grade sfg
  set status = 'missing',
      grade = 0
  from final_exam fe
  where sfg.final_exam_id = fe.id
    and sfg.status = 'pending'
    and fe.due_date is not null
    and fe.due_date < now();
end;
$$;

comment on function public.mark_overdue_pending_work_missing() is
  'Sets pending student_tasks and student_finalexam_grade rows to missing with grade 0 when the parent due_date is in the past.';
