-- Curriculum stages: subjects may optionally belong to one stage.

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period integer not null,
  level integer not null,
  created_at timestamptz not null default now(),
  constraint stages_name_not_blank_check check (trim(name) <> ''),
  constraint stages_period_positive_check check (period > 0),
  constraint stages_level_positive_check check (level > 0)
);

create unique index stages_name_unique_idx
  on public.stages (lower(trim(name)));

create index stages_level_period_idx
  on public.stages (level, period);

comment on table public.stages is
  'Curriculum stages used to group subjects on the manage-subjects board.';

comment on column public.stages.period is
  'Stage period number (positive integer).';

comment on column public.stages.level is
  'Stage level number (positive integer).';

alter table public.subjects
  add column stage_id uuid references public.stages (id) on delete set null;

create index subjects_stage_id_idx
  on public.subjects (stage_id);

comment on column public.subjects.stage_id is
  'Optional stage this subject belongs to. Null = unassigned.';

insert into public.permissions (key, label, feature_group, access)
values
  ('subjects.stages.view', 'View subject stages', 'subjects', 'read'),
  ('subjects.stages.create', 'Create subject stage', 'subjects', 'write'),
  ('subjects.stages.update', 'Edit subject stage', 'subjects', 'write'),
  ('subjects.stages.delete', 'Delete subject stage', 'subjects', 'write')
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'subjects.stages.view'),
  ('manager', 'subjects.stages.create'),
  ('manager', 'subjects.stages.update'),
  ('manager', 'subjects.stages.delete')
on conflict (role, permission_key) do nothing;
