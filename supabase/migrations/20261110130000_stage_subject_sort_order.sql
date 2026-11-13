-- Persist kanban column / card order for stages and subjects.

alter table public.stages
  add column sort_order integer not null default 0;

alter table public.subjects
  add column sort_order integer not null default 0;

create index stages_sort_order_idx
  on public.stages (sort_order);

create index subjects_stage_sort_order_idx
  on public.subjects (stage_id, sort_order);

comment on column public.stages.sort_order is
  'Display order of stage columns on the manage-subjects board.';

comment on column public.subjects.sort_order is
  'Display order of a subject within its stage column (or unassigned).';

-- Seed stage order from current level/period/name ranking.
with ranked as (
  select
    id,
    (row_number() over (
      order by level asc, period asc, name asc, created_at asc
    ) - 1)::integer as next_sort
  from public.stages
)
update public.stages s
set sort_order = ranked.next_sort
from ranked
where s.id = ranked.id;

-- Seed subject order within each stage (and unassigned) by name.
with ranked as (
  select
    id,
    (row_number() over (
      partition by stage_id
      order by name asc, created_at asc nulls last, id asc
    ) - 1)::integer as next_sort
  from public.subjects
)
update public.subjects sub
set sort_order = ranked.next_sort
from ranked
where sub.id = ranked.id;
