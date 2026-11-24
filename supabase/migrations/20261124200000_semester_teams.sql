-- Semester teams: organizer columns for the manage-semesters kanban only.

create table public.semester_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint semester_teams_name_not_blank_check check (trim(name) <> '')
);

create unique index semester_teams_name_unique_idx
  on public.semester_teams (lower(trim(name)));

create index semester_teams_sort_order_idx
  on public.semester_teams (sort_order);

comment on table public.semester_teams is
  'Organizer teams used to group semesters on the manage-semesters board. Does not affect classes, payments, or enrollment.';

comment on column public.semester_teams.sort_order is
  'Display order of team columns on the manage-semesters board.';

alter table public.semesters
  add column team_id uuid references public.semester_teams (id) on delete set null,
  add column sort_order integer not null default 0;

create index semesters_team_id_idx
  on public.semesters (team_id);

create index semesters_team_sort_order_idx
  on public.semesters (team_id, sort_order);

comment on column public.semesters.team_id is
  'Optional semester team this semester belongs to. Null = unassigned. Organizer only.';

comment on column public.semesters.sort_order is
  'Display order of a semester within its team column (or unassigned).';

with ranked as (
  select
    id,
    (row_number() over (
      partition by team_id
      order by name asc, created_at asc nulls last, id asc
    ) - 1)::integer as next_sort
  from public.semesters
)
update public.semesters s
set sort_order = ranked.next_sort
from ranked
where s.id = ranked.id;

insert into public.permissions (key, label, feature_group, access)
values
  ('semesters.teams.view', 'View semester teams', 'semesters', 'read'),
  ('semesters.teams.create', 'Create semester team', 'semesters', 'write'),
  ('semesters.teams.update', 'Edit semester team', 'semesters', 'write'),
  ('semesters.teams.delete', 'Delete semester team', 'semesters', 'write')
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'semesters.teams.view'),
  ('manager', 'semesters.teams.create'),
  ('manager', 'semesters.teams.update'),
  ('manager', 'semesters.teams.delete')
on conflict (role, permission_key) do nothing;
