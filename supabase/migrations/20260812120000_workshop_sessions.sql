-- Workshop session agenda/log (not linked to instructor_schedule_slots).
-- Also allow workshops.number_of_sessions = 0 for auto-sync after deletes.

alter table public.workshops
  drop constraint if exists workshops_number_of_sessions_positive;

alter table public.workshops
  add constraint workshops_number_of_sessions_nonnegative
    check (number_of_sessions is null or number_of_sessions >= 0);

create table public.workshop_sessions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  nb_order integer not null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  nb_hours numeric(5, 2) not null,
  topic text not null,
  notes text,
  suggestions text,
  status text not null default 'planned',
  participants_eval smallint,
  session_eval smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshop_sessions_status_check
    check (status in ('planned', 'done')),
  constraint workshop_sessions_participants_eval_check
    check (
      participants_eval is null
      or (participants_eval >= 1 and participants_eval <= 10)
    ),
  constraint workshop_sessions_session_eval_check
    check (
      session_eval is null
      or (session_eval >= 1 and session_eval <= 10)
    ),
  constraint workshop_sessions_end_after_start
    check (end_time > start_time),
  constraint workshop_sessions_nb_hours_positive
    check (nb_hours > 0),
  constraint workshop_sessions_nb_order_positive
    check (nb_order >= 1),
  constraint workshop_sessions_workshop_nb_order_key
    unique (workshop_id, nb_order)
);

comment on table public.workshop_sessions is
  'Agenda/log of sessions for a workshop (topics, hours, notes, evals). Not linked to schedule slots.';

comment on column public.workshop_sessions.status is
  'planned | done';

comment on column public.workshop_sessions.nb_order is
  '1-based display/order index within the workshop; unique per workshop.';

comment on column public.workshop_sessions.participants_eval is
  'Optional 1–10 participant evaluation rating.';

comment on column public.workshop_sessions.session_eval is
  'Optional 1–10 session quality evaluation rating.';

create index idx_workshop_sessions_workshop_id
  on public.workshop_sessions (workshop_id);

create index idx_workshop_sessions_workshop_session_date
  on public.workshop_sessions (workshop_id, session_date);

create index idx_workshop_sessions_workshop_status
  on public.workshop_sessions (workshop_id, status);
