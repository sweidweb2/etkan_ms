-- Cap credit payments by remaining balance only.
-- least(phase.amount, remaining) under-allows when adjustments/debits make
-- remaining_amount larger than the phase list price.

create or replace function public.create_student_payment(
  p_student_payment_phase_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_received_by text,
  p_received_by_management boolean,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
  v_payment public.student_payments;
  v_drop jsonb;
  v_max_amount numeric;
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_student_payment_phase_id
  for update;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  perform public.internal_assert_spp_credit_payment_allowed(p_student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = p_student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  v_max_amount := greatest(coalesce(v_spp.remaining_amount, 0), 0);

  if p_amount is null or p_amount <= 0 or p_amount > v_max_amount then
    raise exception
      'Amount must be greater than 0 and at most the remaining balance (%).',
      v_max_amount;
  end if;

  insert into public.student_payments (
    student_payment_phase_id,
    payment_date,
    amount,
    type,
    payment_method,
    received_by,
    received_by_management,
    receipt_number,
    notes
  )
  values (
    p_student_payment_phase_id,
    p_payment_date,
    p_amount,
    'credit',
    p_payment_method,
    p_received_by,
    coalesce(p_received_by_management, false),
    null,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_payment;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);
  v_drop := public.try_complete_semester_drop_for_spp(v_spp.id);

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp.id;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'paymentPhaseId', v_phase.id,
    'dropCompletion', v_drop,
    'spp', to_jsonb(v_spp)
  );
end;
$$;

create or replace function public.update_student_payment(
  p_id uuid,
  p_student_payment_phase_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_received_by text,
  p_received_by_management boolean,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.student_payments;
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
  v_payment public.student_payments;
  v_drop jsonb;
  v_max_amount numeric;
begin
  select * into v_existing
  from public.student_payments
  where id = p_id
  for update;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Payment does not belong to this student.';
  end if;

  if v_existing.type is distinct from 'credit' then
    raise exception 'Only credit payments can be updated here.';
  end if;

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id
  for update;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  perform public.internal_assert_spp_credit_payment_allowed(v_existing.student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  -- Allow this row's previous amount back into the remaining room.
  v_max_amount := greatest(
    coalesce(v_spp.remaining_amount, 0) + coalesce(v_existing.amount, 0),
    0
  );

  if p_amount is null or p_amount <= 0 or p_amount > v_max_amount then
    raise exception
      'Amount must be greater than 0 and at most the remaining balance (%).',
      v_max_amount;
  end if;

  update public.student_payments
  set
    payment_date = p_payment_date,
    amount = p_amount,
    payment_method = p_payment_method,
    received_by = p_received_by,
    received_by_management = coalesce(p_received_by_management, false),
    receipt_number = null,
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    updated_at = now()
  where id = p_id
  returning * into v_payment;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);
  v_drop := public.try_complete_semester_drop_for_spp(v_spp.id);

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp.id;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'previous', to_jsonb(v_existing),
    'paymentPhaseId', v_phase.id,
    'dropCompletion', v_drop,
    'spp', to_jsonb(v_spp)
  );
end;
$$;

comment on function public.create_student_payment(uuid, date, numeric, text, text, boolean, text) is
  'Creates a credit payment with SPP row lock and remaining_amount cap; recalcs SPP/phase.';

comment on function public.update_student_payment(uuid, uuid, date, numeric, text, text, boolean, text) is
  'Updates a credit payment with SPP row lock and remaining_amount cap; recalcs SPP/phase.';
