-- Payment schedule writes (informational; no financial recalc).

create or replace function public.internal_assert_spp_schedule_editable(p_spp_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_spp_id;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Unable to update payment schedule. Please try again.';
  end if;

  if v_spp.status = 'cancelled' then
    raise exception 'Cannot edit payment schedules on a cancelled student assignment.';
  end if;

  if v_phase.status in ('closed', 'cancelled') then
    raise exception 'Cannot edit payment schedules on a closed or cancelled payment phase.';
  end if;
end;
$$;

create or replace function public.create_student_payment_schedule(
  p_student_payment_phase_id uuid,
  p_due_date date,
  p_amount numeric,
  p_label text,
  p_status text default 'planned',
  p_notes text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.student_payment_schedules;
begin
  perform public.internal_assert_spp_schedule_editable(p_student_payment_phase_id);

  if p_due_date is null then
    raise exception 'Due date is required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0.';
  end if;

  if nullif(btrim(coalesce(p_label, '')), '') is null then
    raise exception 'Label is required.';
  end if;

  if char_length(btrim(p_label)) > 80 then
    raise exception 'Label must be at most 80 characters.';
  end if;

  if p_status is null or p_status not in ('planned', 'paid', 'waived', 'cancelled') then
    raise exception 'Invalid schedule status.';
  end if;

  insert into public.student_payment_schedules (
    student_payment_phase_id,
    due_date,
    amount,
    label,
    status,
    notes,
    created_by
  )
  values (
    p_student_payment_phase_id,
    p_due_date,
    p_amount,
    btrim(p_label),
    p_status,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_created_by
  )
  returning * into v_schedule;

  return jsonb_build_object(
    'schedule', to_jsonb(v_schedule),
    'studentPaymentPhaseId', p_student_payment_phase_id
  );
end;
$$;

create or replace function public.update_student_payment_schedule(
  p_id uuid,
  p_student_payment_phase_id uuid,
  p_due_date date,
  p_amount numeric,
  p_label text,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.student_payment_schedules;
  v_schedule public.student_payment_schedules;
begin
  select * into v_existing
  from public.student_payment_schedules
  where id = p_id;

  if not found then
    raise exception 'Payment schedule not found.';
  end if;

  if v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Payment schedule does not belong to this student.';
  end if;

  perform public.internal_assert_spp_schedule_editable(p_student_payment_phase_id);

  if p_due_date is null then
    raise exception 'Due date is required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0.';
  end if;

  if nullif(btrim(coalesce(p_label, '')), '') is null then
    raise exception 'Label is required.';
  end if;

  if char_length(btrim(p_label)) > 80 then
    raise exception 'Label must be at most 80 characters.';
  end if;

  if p_status is null or p_status not in ('planned', 'paid', 'waived', 'cancelled') then
    raise exception 'Invalid schedule status.';
  end if;

  update public.student_payment_schedules
  set
    due_date = p_due_date,
    amount = p_amount,
    label = btrim(p_label),
    status = p_status,
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    updated_at = now()
  where id = p_id
  returning * into v_schedule;

  return jsonb_build_object(
    'schedule', to_jsonb(v_schedule),
    'previous', to_jsonb(v_existing),
    'studentPaymentPhaseId', p_student_payment_phase_id
  );
end;
$$;

create or replace function public.delete_student_payment_schedule(
  p_id uuid,
  p_student_payment_phase_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.student_payment_schedules;
begin
  select * into v_existing
  from public.student_payment_schedules
  where id = p_id;

  if not found then
    raise exception 'Payment schedule not found.';
  end if;

  if p_student_payment_phase_id is not null
    and v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Payment schedule does not belong to this student.';
  end if;

  perform public.internal_assert_spp_schedule_editable(v_existing.student_payment_phase_id);

  delete from public.student_payment_schedules
  where id = p_id;

  return jsonb_build_object(
    'deleted', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_existing.student_payment_phase_id
  );
end;
$$;
