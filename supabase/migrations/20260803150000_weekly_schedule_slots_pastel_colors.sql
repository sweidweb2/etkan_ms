-- Switch schedule slot palette to pastels and backfill existing rows.

alter table weekly_schedule_slots
  alter column color set default '#BAE6FD';

update weekly_schedule_slots
set color = case lower(color)
  when '#0284c7' then '#BAE6FD' -- sky
  when '#059669' then '#A7F3D0' -- emerald
  when '#7c3aed' then '#DDD6FE' -- violet
  when '#d97706' then '#FDE68A' -- amber
  when '#e11d48' then '#FECDD3' -- rose
  when '#bae6fd' then '#BAE6FD'
  when '#a7f3d0' then '#A7F3D0'
  when '#ddd6fe' then '#DDD6FE'
  when '#fde68a' then '#FDE68A'
  when '#fecdd3' then '#FECDD3'
  else '#BAE6FD'
end;

comment on column weekly_schedule_slots.color is
  'Calendar event color as #RRGGBB pastel hex.';
