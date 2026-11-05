-- Drop required % uses adjusted final due; lock credit payments on paid SPPs;
-- lock schedule/adjustment/credit payment mutations after completed drop.

create or replace function public.internal_spp_has_completed_drop(p_spp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.semester_drop_requests
    where spp_id = p_spp_id
      and status = 'completed'
  );
$$;

comment on function public.internal_spp_has_completed_drop(uuid) is
  'True when the SPP has a completed semester drop request.';

create or replace function public.internal_assert_spp_credit_payment_allowed(
  p_spp_id uuid
)
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
    raise exception 'Unable to create payment. Please try again.';
  end if;

  if v_phase.status = 'cancelled' then
    raise exception 'Cannot record payments on a cancelled payment phase.';
  end if;

  if v_spp.status = 'cancelled' then
    raise exception 'Cannot record payments on a cancelled student assignment.';
  end if;

  if public.internal_spp_has_completed_drop(v_spp.id) then
    raise exception 'Cannot record payments on a completed semester drop.';
  end if;

  if v_spp.status = 'paid' then
    raise exception 'Cannot record payments on a paid student assignment.';
  end if;
end;
$$;

comment on function public.internal_assert_spp_credit_payment_allowed(uuid) is
  'Blocks credit payment writes on cancelled, paid, or completed-drop SPPs.';

create or replace function public.internal_assert_spp_adjustment_editable(
  p_spp_id uuid
)
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
    raise exception 'Unable to load payment phase.';
  end if;

  if v_phase.status = 'cancelled' then
    raise exception 'Cannot change adjustments on a cancelled payment phase.';
  end if;

  if v_spp.status = 'cancelled' then
    raise exception 'Cannot change adjustments on a cancelled student assignment.';
  end if;

  if public.internal_spp_has_completed_drop(v_spp.id) then
    raise exception 'Cannot change adjustments on a completed semester drop.';
  end if;
end;
$$;

comment on function public.internal_assert_spp_adjustment_editable(uuid) is
  'Blocks adjustment writes on cancelled or completed-drop SPPs.';

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

  if v_spp.status = 'paid' then
    raise exception 'Cannot edit payment schedules on a paid student assignment.';
  end if;

  if public.internal_spp_has_completed_drop(v_spp.id) then
    raise exception 'Cannot edit payment schedules on a completed semester drop.';
  end if;

  if v_phase.status in ('closed', 'cancelled') then
    raise exception 'Cannot edit payment schedules on a closed or cancelled payment phase.';
  end if;
end;
$$;

--------------------------------------------------
-- Drop create: required = final_amount_due × %
--------------------------------------------------

create or replace function public.create_semester_drop_request(
  p_student_id uuid,
  p_class_id uuid,
  p_required_percent numeric,
  p_requested_by uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes;
  v_phase public.payment_phases;
  v_spp public.student_payment_phases;
  v_percent numeric(5,2);
  v_base numeric(10,2);
  v_required numeric(10,2);
  v_deadline date;
  v_req public.semester_drop_requests;
  v_complete jsonb;
begin
  if p_student_id is null or p_class_id is null then
    raise exception 'Student and class are required.';
  end if;

  v_percent := round(coalesce(p_required_percent, 50)::numeric, 2);
  if v_percent <= 0 or v_percent > 100 then
    raise exception 'Required percent must be between 0 and 100.';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id;

  if not found then
    raise exception 'Class not found.';
  end if;

  if v_class.semester_id is null then
    raise exception 'Class has no semester.';
  end if;

  if not exists (
    select 1
    from public.student_class
    where user_id = p_student_id
      and class_id = p_class_id
  ) then
    raise exception 'Student is not a member of this class.';
  end if;

  if exists (
    select 1
    from public.semester_drop_requests
    where student_id = p_student_id
      and semester_id = v_class.semester_id
      and status = 'pending'
  ) then
    raise exception 'A pending drop request already exists for this student and semester.';
  end if;

  select * into v_phase
  from public.payment_phases
  where semester_id = v_class.semester_id
    and status = 'opened'
  order by created_at desc
  limit 1;

  if not found then
    select * into v_phase
    from public.payment_phases
    where semester_id = v_class.semester_id
      and status = 'closed'
    order by created_at desc
    limit 1;
  end if;

  if not found or v_phase.status = 'cancelled' then
    raise exception 'NO_SPP_PHASE';
  end if;

  select * into v_spp
  from public.student_payment_phases
  where student_id = p_student_id
    and payment_phase_id = v_phase.id
    and status is distinct from 'cancelled';

  if not found then
    raise exception 'NO_SPP';
  end if;

  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);

  -- Required % of adjusted final due (phase amount after financial adjustments).
  v_base := greatest(coalesce(v_spp.final_amount_due, v_phase.amount, 0), 0);
  v_required := round((v_base * v_percent / 100.0)::numeric, 2);
  v_deadline := (v_phase.start_date + interval '2 months')::date;

  insert into public.semester_drop_requests (
    student_id,
    semester_id,
    class_id,
    payment_phase_id,
    spp_id,
    status,
    required_percent,
    required_amount,
    phase_amount_snapshot,
    deadline_at,
    requested_by,
    notes
  )
  values (
    p_student_id,
    v_class.semester_id,
    p_class_id,
    v_phase.id,
    v_spp.id,
    'pending',
    v_percent,
    v_required,
    coalesce(v_phase.amount, 0),
    v_deadline,
    p_requested_by,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_req;

  if coalesce(v_spp.total_paid, 0) >= v_required then
    v_complete := public.complete_semester_drop_request(v_req.id);
    return jsonb_build_object(
      'request', v_complete -> 'request',
      'completedImmediately', true,
      'spp', v_complete -> 'spp'
    );
  end if;

  return jsonb_build_object(
    'request', to_jsonb(v_req),
    'completedImmediately', false,
    'spp', to_jsonb(v_spp)
  );
end;
$$;

comment on function public.create_semester_drop_request(uuid, uuid, numeric, uuid, text) is
  'Create pending semester drop; required_amount = final_amount_due × %; auto-complete when paid >= required.';

--------------------------------------------------
-- Credit payment writes
--------------------------------------------------

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
begin
  perform public.internal_assert_spp_credit_payment_allowed(p_student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = p_student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if p_amount is null or p_amount <= 0 or p_amount > v_phase.amount then
    raise exception 'Amount must be greater than 0 and at most the payment phase price.';
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

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'paymentPhaseId', v_phase.id,
    'dropCompletion', v_drop
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
begin
  select * into v_existing
  from public.student_payments
  where id = p_id;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Payment does not belong to this student.';
  end if;

  if v_existing.type is distinct from 'credit' then
    raise exception 'Only credit payments can be updated here.';
  end if;

  perform public.internal_assert_spp_credit_payment_allowed(v_existing.student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if p_amount is null or p_amount <= 0 or p_amount > v_phase.amount then
    raise exception 'Amount must be greater than 0 and at most the payment phase price.';
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

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'previous', to_jsonb(v_existing),
    'paymentPhaseId', v_phase.id,
    'dropCompletion', v_drop
  );
end;
$$;

--------------------------------------------------
-- Adjustment writes
--------------------------------------------------

create or replace function public.create_student_financial_adjustment(
  p_student_payment_phase_id uuid,
  p_type text,
  p_value_type text,
  p_value numeric,
  p_reason text,
  p_effective_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
  v_row public.student_financial_adjustments;
begin
  perform public.internal_assert_spp_adjustment_editable(p_student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = p_student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  begin
    insert into public.student_financial_adjustments (
      student_payment_phase_id,
      type,
      value_type,
      value,
      reason,
      effective_date
    )
    values (
      p_student_payment_phase_id,
      p_type,
      p_value_type,
      p_value,
      nullif(btrim(coalesce(p_reason, '')), ''),
      p_effective_date
    )
    returning * into v_row;
  exception
    when unique_violation then
      raise exception 'This student payment phase already has a financial adjustment.';
  end;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'adjustment', to_jsonb(v_row),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id
  );
end;
$$;

create or replace function public.update_student_financial_adjustment(
  p_id uuid,
  p_student_payment_phase_id uuid,
  p_type text,
  p_value_type text,
  p_value numeric,
  p_reason text,
  p_effective_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.student_financial_adjustments;
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
  v_row public.student_financial_adjustments;
begin
  select * into v_existing
  from public.student_financial_adjustments
  where id = p_id;

  if not found then
    raise exception 'Adjustment not found.';
  end if;

  if v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Adjustment does not belong to this student payment phase.';
  end if;

  perform public.internal_assert_spp_adjustment_editable(v_existing.student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  update public.student_financial_adjustments
  set
    type = p_type,
    value_type = p_value_type,
    value = p_value,
    reason = nullif(btrim(coalesce(p_reason, '')), ''),
    effective_date = p_effective_date,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'adjustment', to_jsonb(v_row),
    'previous', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id
  );
end;
$$;

create or replace function public.delete_student_financial_adjustment(
  p_id uuid,
  p_student_payment_phase_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.student_financial_adjustments;
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
begin
  select * into v_existing
  from public.student_financial_adjustments
  where id = p_id;

  if not found then
    raise exception 'Adjustment not found.';
  end if;

  if p_student_payment_phase_id is not null
     and v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Adjustment does not belong to this student payment phase.';
  end if;

  perform public.internal_assert_spp_adjustment_editable(v_existing.student_payment_phase_id);

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Unable to load payment phase.';
  end if;

  delete from public.student_financial_adjustments
  where id = p_id;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'deleted', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id
  );
end;
$$;

create or replace function public.delete_student_payment(
  p_id uuid,
  p_student_payment_phase_id uuid default null
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
begin
  select * into v_existing
  from public.student_payments
  where id = p_id;

  if not found then
    raise exception 'Payment not found.';
  end if;

  if p_student_payment_phase_id is not null
     and v_existing.student_payment_phase_id is distinct from p_student_payment_phase_id then
    raise exception 'Payment does not belong to this student.';
  end if;

  if v_existing.type is distinct from 'credit' then
    raise exception 'Only credit payments can be deleted here.';
  end if;

  perform public.internal_assert_spp_credit_payment_allowed(
    v_existing.student_payment_phase_id
  );

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  delete from public.student_payments where id = v_existing.id;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'deleted', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id
  );
end;
$$;

create or replace function public.transfer_student_payment_phase(
  p_spp_id uuid,
  p_destination_payment_phase_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_dest public.payment_phases;
  v_source public.payment_phases;
  v_source_id uuid;
  v_existing uuid;
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_spp_id;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  if public.internal_spp_has_completed_drop(v_spp.id) then
    raise exception 'Cannot transfer a completed semester drop assignment.';
  end if;

  if v_spp.status = 'cancelled' then
    raise exception 'Cancelled student payment phases cannot be transferred.';
  end if;

  if v_spp.payment_phase_id = p_destination_payment_phase_id then
    raise exception 'Destination must be different from the current payment phase.';
  end if;

  select * into v_dest
  from public.payment_phases
  where id = p_destination_payment_phase_id;

  if not found then
    raise exception 'Destination payment phase not found.';
  end if;

  if v_dest.status is distinct from 'opened'
     and v_dest.status is distinct from 'closed' then
    raise exception 'Destination must be an opened or closed payment phase.';
  end if;

  select * into v_source
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Source payment phase not found.';
  end if;

  if v_source.semester_id = v_dest.semester_id then
    raise exception 'Cannot transfer to a payment phase in the same semester.';
  end if;

  select id into v_existing
  from public.student_payment_phases
  where student_id = v_spp.student_id
    and payment_phase_id = p_destination_payment_phase_id;

  if found then
    raise exception 'Student already has a payment record on that phase.';
  end if;

  v_source_id := v_spp.payment_phase_id;

  update public.student_payment_phases
  set payment_phase_id = p_destination_payment_phase_id,
      updated_at = now()
  where id = p_spp_id;

  perform public.internal_recalc_payment_phase_status_from_spps(v_source_id);
  perform public.internal_recalc_payment_phase_status_from_spps(p_destination_payment_phase_id);

  return jsonb_build_object(
    'sppId', p_spp_id,
    'studentId', v_spp.student_id,
    'fromPaymentPhaseId', v_source_id,
    'toPaymentPhaseId', p_destination_payment_phase_id
  );
end;
$$;

revoke all on function public.internal_spp_has_completed_drop(uuid) from public;
revoke all on function public.internal_assert_spp_credit_payment_allowed(uuid) from public;
revoke all on function public.internal_assert_spp_adjustment_editable(uuid) from public;

grant execute on function public.internal_spp_has_completed_drop(uuid) to service_role;
grant execute on function public.internal_assert_spp_credit_payment_allowed(uuid) to service_role;
grant execute on function public.internal_assert_spp_adjustment_editable(uuid) to service_role;
