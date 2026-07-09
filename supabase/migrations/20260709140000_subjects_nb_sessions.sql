-- Planned session count per subject curriculum (used for class completion tracking).

alter table subjects
add column if not exists nb_sessions integer not null default 0;

alter table subjects
drop constraint if exists subjects_nb_sessions_non_negative;

alter table subjects
add constraint subjects_nb_sessions_non_negative
check (nb_sessions >= 0);

comment on column subjects.nb_sessions is
  'Total planned teaching sessions for this subject curriculum.';
