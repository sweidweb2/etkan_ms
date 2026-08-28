-- Guest teams: a named group of guests with an expected start date.
-- Membership is exclusive: a guest belongs to at most one team.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  expected_start_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'started')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teams is 'Named groups of guests assembled from the manage guests page.';
comment on column public.teams.name is 'Display name of the team.';
comment on column public.teams.expected_start_date is 'Optional date the team is expected to start.';
comment on column public.teams.status is 'scheduled | cancelled | started.';

create unique index teams_name_lower_unique on public.teams (lower(name));
create index idx_teams_status on public.teams (status);
create index idx_teams_created_at on public.teams (created_at desc);

alter table public.teams enable row level security;

create table public.team_guests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_guests_guest_id_unique unique (guest_id)
);

comment on table public.team_guests is 'Team membership. The unique guest_id keeps a guest in at most one team.';
comment on column public.team_guests.team_id is 'Team the guest belongs to.';
comment on column public.team_guests.guest_id is 'Guest assigned to the team; unique across all teams.';

create index idx_team_guests_team_id on public.team_guests (team_id);

alter table public.team_guests enable row level security;

-- Permissions ------------------------------------------------------------

insert into public.permissions (key, label, feature_group, access) values
  ('teams.view', 'View teams', 'teams', 'read'),
  ('teams.create', 'Create team', 'teams', 'write'),
  ('teams.update', 'Edit team', 'teams', 'write'),
  ('teams.delete', 'Delete team', 'teams', 'write'),
  ('teams.assign_guest', 'Assign guest to team', 'teams', 'write')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key)
select r.role, p.key
from (values ('admin'), ('manager'), ('co-manager'), ('ceo')) as r(role)
cross join (
  values ('teams.view'), ('teams.create'), ('teams.update'), ('teams.delete'), ('teams.assign_guest')
) as p(key)
on conflict do nothing;
