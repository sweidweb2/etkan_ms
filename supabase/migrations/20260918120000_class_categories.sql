-- Class ↔ category follow-up assignments (in progress / done).

create type public.class_category_status as enum ('in_progress', 'done');

create table public.class_categories (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  status public.class_category_status not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_categories_class_category_unique unique (class_id, category_id)
);

create index class_categories_class_id_idx
  on public.class_categories (class_id);

create index class_categories_category_id_idx
  on public.class_categories (category_id);

create index class_categories_class_id_status_idx
  on public.class_categories (class_id, status);

comment on table public.class_categories is
  'Follow-up status of a category for a class. No row = not taken (pool).';
