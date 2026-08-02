-- Workshops management: workshops + instructors, documents, and payments.

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  status text not null default 'draft',
  target_audience text,
  nb_participants integer,
  proposal_notes text,
  number_of_sessions integer,
  price numeric(12, 2),
  start_date date,
  end_date date,
  delivery_place text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint workshops_status_check
    check (
      status in (
        'draft',
        'proposal',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),
  constraint workshops_nb_participants_nonnegative
    check (nb_participants is null or nb_participants >= 0),
  constraint workshops_number_of_sessions_positive
    check (number_of_sessions is null or number_of_sessions > 0),
  constraint workshops_price_nonnegative
    check (price is null or price >= 0),
  constraint workshops_end_on_or_after_start
    check (
      start_date is null
      or end_date is null
      or end_date >= start_date
    )
);

comment on table public.workshops is
  'Workshop offerings managed by staff (lifecycle, pricing, delivery).';

comment on column public.workshops.subject is
  'Free-text subject/topic label (not an FK to subjects).';

comment on column public.workshops.status is
  'Lifecycle: draft, proposal, scheduled, in_progress, completed, cancelled.';

comment on column public.workshops.deleted_at is
  'Soft-delete timestamp; null means active.';

create index idx_workshops_status on public.workshops (status);
create index idx_workshops_start_date on public.workshops (start_date);
create index idx_workshops_created_by on public.workshops (created_by);
create index idx_workshops_deleted_at on public.workshops (deleted_at);

create table public.workshop_instructors (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  wage_type text not null,
  wage_amount numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  constraint workshop_instructors_role_check
    check (role in ('lead', 'assistant', 'guest')),
  constraint workshop_instructors_wage_type_check
    check (wage_type in ('fixed', 'per_session', 'percentage')),
  constraint workshop_instructors_wage_amount_nonnegative
    check (wage_amount is null or wage_amount >= 0),
  constraint workshop_instructors_workshop_user_unique
    unique (workshop_id, user_id)
);

comment on table public.workshop_instructors is
  'Instructors assigned to a workshop with role and wage terms.';

create index idx_workshop_instructors_workshop_id
  on public.workshop_instructors (workshop_id);

create index idx_workshop_instructors_user_id
  on public.workshop_instructors (user_id);

create table public.workshop_documents (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  name text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint workshop_documents_file_size_nonnegative
    check (file_size is null or file_size >= 0),
  constraint workshop_documents_workshop_storage_path_unique
    unique (workshop_id, storage_path)
);

comment on table public.workshop_documents is
  'Files attached to a workshop (storage_path points at object storage).';

create index idx_workshop_documents_workshop_id
  on public.workshop_documents (workshop_id);

create index idx_workshop_documents_uploaded_by
  on public.workshop_documents (uploaded_by);

create table public.workshop_payments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  amount numeric(12, 2) not null,
  type text not null,
  payment_date date not null,
  payment_method text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint workshop_payments_amount_positive
    check (amount > 0),
  constraint workshop_payments_type_check
    check (type in ('debit', 'credit'))
);

comment on table public.workshop_payments is
  'Ledger-style workshop money movements (debit/credit).';

comment on column public.workshop_payments.type is
  'debit = money out / cost; credit = money in / revenue.';

create index idx_workshop_payments_workshop_id
  on public.workshop_payments (workshop_id);

create index idx_workshop_payments_payment_date
  on public.workshop_payments (payment_date);

create index idx_workshop_payments_type
  on public.workshop_payments (type);

create index idx_workshop_payments_created_by
  on public.workshop_payments (created_by);
