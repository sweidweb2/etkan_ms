-- Semester codes are now editable by managers.
-- Keep the copied payment_phases.semester_code in sync in the same transaction.

create or replace function public.sync_payment_phase_semester_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_phases
  set semester_code = new.semester_code
  where semester_id = new.id
    and semester_code is distinct from new.semester_code;

  return new;
end;
$$;

revoke all on function public.sync_payment_phase_semester_code() from public;

drop trigger if exists trg_sync_payment_phase_semester_code on public.semesters;

create trigger trg_sync_payment_phase_semester_code
  after update of semester_code on public.semesters
  for each row
  when (old.semester_code is distinct from new.semester_code)
  execute function public.sync_payment_phase_semester_code();

comment on column public.semesters.semester_code is
  'Unique 4-digit public code. Editable by managers; changes propagate to payment_phases.semester_code.';

comment on column public.payment_phases.semester_code is
  'Copy of semesters.semester_code, kept in sync by trg_sync_payment_phase_semester_code.';
