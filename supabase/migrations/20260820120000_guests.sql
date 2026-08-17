-- Guest follow-up: pre-user intake, status history, one-shot registration invites.

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  age integer not null
    check (age > 0),
  school_or_university text,
  education_level text not null
    check (education_level in (
      'school',
      'uni_year_1',
      'uni_year_2',
      'uni_year_3',
      'uni_year_4_plus',
      'uni_graduate',
      'other'
    )),
  interested_service text not null
    check (interested_service in (
      'etkan_roadmap',
      'private',
      'workshops'
    )),
  status text not null default 'scheduled'
    check (status in (
      'scheduled',
      'pending',
      'cancelled',
      'rejected',
      'finished'
    )),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guests is
  'Pre-user guest intake cards for follow-up until routed to another team.';

comment on column public.guests.status is
  'Profile pointer: scheduled | pending | cancelled | rejected | finished. Pipeline log lives in guest_status_events.';

create index idx_guests_status
  on public.guests (status);

create index idx_guests_created_at
  on public.guests (created_at desc);

create index idx_guests_interested_service
  on public.guests (interested_service);

alter table public.guests enable row level security;

create table public.guest_status_events (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null
    references public.guests (id) on delete cascade,
  status text not null
    check (status in (
      'started',
      'finished_meeting',
      'finished_parent_meeting',
      'chose_plan',
      'routed_correctly',
      'finishing_routing_doc',
      'finished'
    )),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.guest_status_events is
  'Pipeline checkpoint log. CRUD only while guests.status is pending.';

create index idx_guest_status_events_guest_created
  on public.guest_status_events (guest_id, created_at desc);

alter table public.guest_status_events enable row level security;

alter table public.student_registration_applications
  add column guest_id uuid
    references public.guests (id) on delete cascade;

alter table public.student_registration_applications
  drop constraint if exists student_registration_applications_status_check;

alter table public.student_registration_applications
  add constraint student_registration_applications_status_check
  check (status in (
    'open',
    'pending',
    'accepted',
    'applied',
    'missing',
    'rejected',
    'cancelled'
  ));

create unique index idx_student_registration_applications_guest_id_active
  on public.student_registration_applications (guest_id)
  where guest_id is not null and status <> 'cancelled';

create index idx_student_registration_applications_guest_id
  on public.student_registration_applications (guest_id);

comment on column public.student_registration_applications.guest_id is
  'Optional link to a guest intake card; at most one non-cancelled application per guest.';

create table public.guest_registration_invites (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null
    references public.guests (id) on delete cascade,
  token text not null,
  application_id uuid
    references public.student_registration_applications (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  cancelled_at timestamptz,
  constraint guest_registration_invites_guest_id_unique unique (guest_id),
  constraint guest_registration_invites_token_unique unique (token)
);

comment on table public.guest_registration_invites is
  'One-shot public registration link per guest; staff stop via cancelled_at (no invite hard-delete UI).';

create index idx_guest_registration_invites_token
  on public.guest_registration_invites (token);

alter table public.guest_registration_invites enable row level security;
