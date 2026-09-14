-- Global categories + exercises catalogs and subject / category junctions.

create type public.exercise_level as enum ('easy', 'medium', 'hard');
create type public.exercise_status as enum ('draft', 'active', 'archived');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank_check
    check (trim(name) <> '')
);

create unique index categories_name_unique_idx
  on public.categories (lower(trim(name)));

create index categories_parent_id_idx
  on public.categories (parent_id);

comment on table public.categories is
  'Hierarchy via parent_id. Names are unique case-insensitively after trim.';

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body jsonb not null,
  level public.exercise_level not null default 'easy',
  status public.exercise_status not null default 'active',
  categories text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_title_not_blank_check
    check (trim(title) <> ''),
  constraint exercises_categories_cardinality_check
    check (cardinality(categories) > 0)
);

create index exercises_level_idx on public.exercises (level);
create index exercises_status_idx on public.exercises (status);
create index exercises_categories_idx on public.exercises using gin (categories);
create index exercises_created_at_idx on public.exercises (created_at);

comment on table public.exercises is
  'categories is a text[] of category names (copied at write time). There is no FK to categories.id.';

create table public.category_exercises (
  category_id uuid not null references public.categories (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  primary key (category_id, exercise_id)
);

create index category_exercises_exercise_id_idx
  on public.category_exercises (exercise_id);

create table public.subject_categories (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (subject_id, category_id)
);

create index subject_categories_category_id_idx
  on public.subject_categories (category_id);

create table public.subject_exercises (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  primary key (subject_id, exercise_id)
);

create index subject_exercises_exercise_id_idx
  on public.subject_exercises (exercise_id);
