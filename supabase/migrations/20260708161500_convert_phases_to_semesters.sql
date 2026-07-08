-- Replace phase-based semester linkage with a dedicated semesters table.

create extension if not exists "pgcrypto";

--------------------------------------------------
-- SEMESTERS
--------------------------------------------------

create table if not exists semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nb_courses integer not null default 0,
  amount numeric(10,2) not null default 0,
  created_at timestamp default now()
);

--------------------------------------------------
-- CLASSES -> SEMESTERS
--------------------------------------------------

alter table classes
add column if not exists semester_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'classes'
      and column_name = 'phase_id'
  ) then
    update classes
    set semester_id = coalesce(semester_id, phase_id);

    alter table classes
    drop column if exists phase_id;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'classes'
      and constraint_name = 'classes_semester_id_fkey'
  ) then
    alter table classes
    add constraint classes_semester_id_fkey
    foreign key (semester_id) references semesters(id) on delete set null;
  end if;
end $$;

create index if not exists idx_classes_semester_id
on classes(semester_id);

--------------------------------------------------
-- SUBSCRIBED PHASES -> SEMESTER LINK
--------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'subscribed_phases'
      and column_name = 'phase_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_name = 'subscribed_phases'
      and column_name = 'semester_id'
  ) then
    alter table subscribed_phases
    rename column phase_id to semester_id;
  end if;
end $$;

alter table subscribed_phases
add column if not exists semester_id uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'subscribed_phases'
      and constraint_name = 'subscribed_phases_semester_id_fkey'
  ) then
    alter table subscribed_phases
    add constraint subscribed_phases_semester_id_fkey
    foreign key (semester_id) references semesters(id) on delete set null;
  end if;
end $$;

create index if not exists idx_subscribed_phases_semester_id
on subscribed_phases(semester_id);

--------------------------------------------------
-- CLEAN UP OLD PHASE TABLE
--------------------------------------------------

drop table if exists phases cascade;
