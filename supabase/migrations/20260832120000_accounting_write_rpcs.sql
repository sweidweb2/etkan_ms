-- Phase 14–17: payment / adjustment / phase create / repair / transfer / cancel
-- write + recalc in one transaction. Reuses internal_recalc_*.

--------------------------------------------------
-- Phase 14: student payment writes
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
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_student_payment_phase_id;

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

  if p_amount is null or p_amount <= 0 or p_amount > v_phase.amount then
    raise exception 'Amount must be greater than 0 and at most the payment phase price.';
  end if;

  insert into public.student_payments (
    student_payment_phase_id,
    payment_date,
    amount,
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
    p_payment_method,
    p_received_by,
    coalesce(p_received_by_management, false),
    null,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_payment;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'paymentPhaseId', v_phase.id
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  if not found then
    raise exception 'Unable to update payment. Please try again.';
  end if;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Unable to update payment. Please try again.';
  end if;

  if v_phase.status = 'cancelled' then
    raise exception 'Cannot record payments on a cancelled payment phase.';
  end if;

  if v_spp.status = 'cancelled' then
    raise exception 'Cannot record payments on a cancelled student assignment.';
  end if;

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

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'previous', to_jsonb(v_existing),
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  if not found then
    raise exception 'Unable to delete payment. Please try again.';
  end if;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Unable to delete payment. Please try again.';
  end if;

  if v_phase.status = 'cancelled' then
    raise exception 'Cannot record payments on a cancelled payment phase.';
  end if;

  if v_spp.status = 'cancelled' then
    raise exception 'Cannot record payments on a cancelled student assignment.';
  end if;

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

create or replace function public.delete_student_payment_phase(
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_phase_id uuid;
  v_has_payments boolean;
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_id;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  select exists (
    select 1
    from public.student_payments
    where student_payment_phase_id = v_spp.id
  )
  into v_has_payments;

  if v_has_payments then
    raise exception 'This student payment phase has payments. Delete all payments first.';
  end if;

  v_phase_id := v_spp.payment_phase_id;

  delete from public.student_payment_phases where id = v_spp.id;

  perform public.internal_recalc_payment_phase_status_from_spps(v_phase_id);

  return jsonb_build_object(
    'deleted', to_jsonb(v_spp),
    'paymentPhaseId', v_phase_id
  );
end;
$$;

--------------------------------------------------
-- Phase 15: adjustment writes
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
  select * into v_spp
  from public.student_payment_phases
  where id = p_student_payment_phase_id;

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

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  if not found then
    raise exception 'Unable to load student payment phase.';
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_existing.student_payment_phase_id;

  if not found then
    raise exception 'Unable to load student payment phase.';
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

  delete from public.student_financial_adjustments where id = v_existing.id;

  perform public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'deleted', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id
  );
end;
$$;

--------------------------------------------------
-- Phase 16: create payment phase + seed SPPs
--------------------------------------------------

create or replace function public.create_payment_phase_with_spps(
  p_name text,
  p_semester_id uuid,
  p_amount numeric,
  p_upfront_amount numeric,
  p_duration_months integer,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semester public.semesters;
  v_phase public.payment_phases;
  v_billing_id uuid;
  v_billing_name text;
  v_original numeric(10,2);
  v_status text;
  v_spp_count integer := 0;
begin
  select * into v_semester
  from public.semesters
  where id = p_semester_id;

  if not found then
    raise exception 'Semester not found.';
  end if;

  if nullif(btrim(coalesce(v_semester.semester_code, '')), '') is null then
    raise exception 'This semester has no semester code.';
  end if;

  if exists (
    select 1
    from public.payment_phases
    where semester_id = p_semester_id
      and status = 'opened'
  ) then
    raise exception 'This semester already has an opened payment phase.';
  end if;

  begin
    insert into public.payment_phases (
      name,
      semester_id,
      semester_code,
      amount,
      upfront_amount,
      duration_months,
      start_date,
      end_date,
      status
    )
    values (
      btrim(p_name),
      p_semester_id,
      v_semester.semester_code,
      p_amount,
      p_upfront_amount,
      p_duration_months,
      p_start_date,
      p_end_date,
      'opened'
    )
    returning * into v_phase;
  exception
    when unique_violation then
      raise exception 'This semester already has an opened payment phase.';
  end;

  select id, name
  into v_billing_id, v_billing_name
  from public.classes
  where semester_id = p_semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  v_original := round(greatest(coalesce(p_amount, 0), 0)::numeric, 2);
  if v_original > 0 then
    v_status := 'pending';
  else
    v_status := 'paid';
  end if;

  if v_billing_id is not null then
    insert into public.student_payment_phases (
      student_id,
      payment_phase_id,
      assigned_at,
      status,
      original_amount,
      adjustment_amount,
      final_amount_due,
      total_paid,
      remaining_amount
    )
    select distinct
      sc.user_id,
      v_phase.id,
      current_date,
      v_status,
      v_original,
      0,
      v_original,
      0,
      v_original
    from public.student_class sc
    where sc.class_id = v_billing_id
    on conflict (student_id, payment_phase_id) do nothing;

    get diagnostics v_spp_count = row_count;
  end if;

  return jsonb_build_object(
    'phase', to_jsonb(v_phase),
    'semester', jsonb_build_object(
      'id', v_semester.id,
      'name', v_semester.name,
      'semester_code', v_semester.semester_code
    ),
    'sppCount', v_spp_count,
    'billingClass', case
      when v_billing_id is null then null
      else jsonb_build_object('id', v_billing_id, 'name', v_billing_name)
    end
  );
end;
$$;

--------------------------------------------------
-- Phase 17: repair / transfer / cancel
--------------------------------------------------

create or replace function public.repair_missing_spp(
  p_payment_phase_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase public.payment_phases;
  v_existing public.student_payment_phases;
  v_billing_id uuid;
  v_enrolled boolean;
  v_was_closed boolean := false;
  v_ensured jsonb;
  v_spp public.student_payment_phases;
  v_created boolean := false;
  v_reactivated boolean := false;
  v_already boolean := false;
  v_phase_reopened boolean := false;
begin
  select * into v_phase
  from public.payment_phases
  where id = p_payment_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
  end if;

  if v_phase.status is distinct from 'opened'
     and v_phase.status is distinct from 'closed' then
    raise exception 'Only opened or closed payment phases can receive assignments.';
  end if;

  select * into v_existing
  from public.student_payment_phases
  where student_id = p_student_id
    and payment_phase_id = p_payment_phase_id;

  if found and v_existing.status is distinct from 'cancelled' then
    return jsonb_build_object(
      'alreadyExisted', true,
      'created', false,
      'reactivated', false,
      'phaseReopened', false,
      'spp', to_jsonb(v_existing)
    );
  end if;

  select id into v_billing_id
  from public.classes
  where semester_id = v_phase.semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  if v_billing_id is null then
    raise exception 'No in-progress class found for this semester.';
  end if;

  select exists (
    select 1
    from public.student_class
    where user_id = p_student_id
      and class_id = v_billing_id
  )
  into v_enrolled;

  if not v_enrolled then
    raise exception 'Student is not enrolled in this semester''s in-progress class.';
  end if;

  v_was_closed := v_phase.status = 'closed';
  v_ensured := public.ensure_spp_for_student_on_phase(
    p_student_id,
    p_payment_phase_id,
    current_date
  );

  v_created := coalesce((v_ensured ->> 'created')::boolean, false);
  v_reactivated := coalesce((v_ensured ->> 'reactivated')::boolean, false);
  v_already := coalesce((v_ensured ->> 'alreadyExisted')::boolean, false);

  if v_already and not v_reactivated then
    return jsonb_build_object(
      'alreadyExisted', true,
      'created', false,
      'reactivated', false,
      'phaseReopened', false,
      'spp', v_ensured -> 'spp'
    );
  end if;

  if v_ensured -> 'spp' is null or jsonb_typeof(v_ensured -> 'spp') = 'null' then
    raise exception 'Unable to assign student payment phase. Please try again.';
  end if;

  if v_was_closed and (v_created or v_reactivated) then
    update public.payment_phases
    set status = 'opened', updated_at = now()
    where id = v_phase.id;
    v_phase_reopened := true;
  end if;

  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  select * into v_spp
  from public.student_payment_phases
  where id = (v_ensured -> 'spp' ->> 'id')::uuid;

  return jsonb_build_object(
    'alreadyExisted', false,
    'created', v_created,
    'reactivated', v_reactivated,
    'phaseReopened', v_phase_reopened,
    'spp', to_jsonb(v_spp)
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
  v_source_id uuid;
  v_existing uuid;
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_spp_id;

  if not found then
    raise exception 'Student payment phase not found.';
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

create or replace function public.cancel_payment_phase(
  p_payment_phase_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.payment_phases;
  v_phase public.payment_phases;
  v_semester public.semesters;
  v_billing_id uuid;
  v_billing_name text;
  v_active integer := 0;
  v_paid integer := 0;
begin
  select * into v_existing
  from public.payment_phases
  where id = p_payment_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
  end if;

  if v_existing.status = 'cancelled' then
    raise exception 'This payment phase is already cancelled.';
  end if;

  update public.payment_phases
  set status = 'cancelled', updated_at = now()
  where id = p_payment_phase_id
  returning * into v_phase;

  select * into v_semester
  from public.semesters
  where id = v_phase.semester_id;

  select
    count(*) filter (where status is distinct from 'cancelled'),
    count(*) filter (where status = 'paid')
  into v_active, v_paid
  from public.student_payment_phases
  where payment_phase_id = v_phase.id;

  select id, name
  into v_billing_id, v_billing_name
  from public.classes
  where semester_id = v_phase.semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  return jsonb_build_object(
    'phase', to_jsonb(v_phase),
    'previousStatus', v_existing.status,
    'semester', case
      when v_semester.id is null then null
      else jsonb_build_object(
        'id', v_semester.id,
        'name', v_semester.name,
        'semester_code', v_semester.semester_code
      )
    end,
    'sppActiveCount', v_active,
    'sppPaidCount', v_paid,
    'billingClass', case
      when v_billing_id is null then null
      else jsonb_build_object('id', v_billing_id, 'name', v_billing_name)
    end
  );
end;
$$;

comment on function public.create_student_payment(uuid, date, numeric, text, text, boolean, text) is
  'Insert a student payment then recalc SPP + parent phase in one transaction.';
comment on function public.update_student_payment(uuid, uuid, date, numeric, text, text, boolean, text) is
  'Update a student payment then recalc SPP + parent phase in one transaction.';
comment on function public.delete_student_payment(uuid, uuid) is
  'Delete a student payment then recalc SPP + parent phase in one transaction.';
comment on function public.delete_student_payment_phase(uuid) is
  'Delete an SPP with no payments, then recalc parent phase status.';
comment on function public.create_student_financial_adjustment(uuid, text, text, numeric, text, date) is
  'Insert one adjustment then recalc SPP + parent phase.';
comment on function public.update_student_financial_adjustment(uuid, uuid, text, text, numeric, text, date) is
  'Update one adjustment then recalc SPP + parent phase.';
comment on function public.delete_student_financial_adjustment(uuid, uuid) is
  'Delete one adjustment then recalc SPP + parent phase.';
comment on function public.create_payment_phase_with_spps(text, uuid, numeric, numeric, integer, date, date) is
  'Insert an opened payment phase and set-based seed SPPs for the in-progress class roster.';
comment on function public.repair_missing_spp(uuid, uuid) is
  'Ensure one enrolled student has an SPP on an opened/closed phase; reopen closed if needed.';
comment on function public.transfer_student_payment_phase(uuid, uuid) is
  'Move an SPP to another opened/closed phase and recalc both phase statuses.';
comment on function public.cancel_payment_phase(uuid) is
  'Set payment phase cancelled. Existing SPPs and payments are kept.';

revoke all on function public.create_student_payment(uuid, date, numeric, text, text, boolean, text) from public;
revoke all on function public.update_student_payment(uuid, uuid, date, numeric, text, text, boolean, text) from public;
revoke all on function public.delete_student_payment(uuid, uuid) from public;
revoke all on function public.delete_student_payment_phase(uuid) from public;
revoke all on function public.create_student_financial_adjustment(uuid, text, text, numeric, text, date) from public;
revoke all on function public.update_student_financial_adjustment(uuid, uuid, text, text, numeric, text, date) from public;
revoke all on function public.delete_student_financial_adjustment(uuid, uuid) from public;
revoke all on function public.create_payment_phase_with_spps(text, uuid, numeric, numeric, integer, date, date) from public;
revoke all on function public.repair_missing_spp(uuid, uuid) from public;
revoke all on function public.transfer_student_payment_phase(uuid, uuid) from public;
revoke all on function public.cancel_payment_phase(uuid) from public;

grant execute on function public.create_student_payment(uuid, date, numeric, text, text, boolean, text) to service_role;
grant execute on function public.update_student_payment(uuid, uuid, date, numeric, text, text, boolean, text) to service_role;
grant execute on function public.delete_student_payment(uuid, uuid) to service_role;
grant execute on function public.delete_student_payment_phase(uuid) to service_role;
grant execute on function public.create_student_financial_adjustment(uuid, text, text, numeric, text, date) to service_role;
grant execute on function public.update_student_financial_adjustment(uuid, uuid, text, text, numeric, text, date) to service_role;
grant execute on function public.delete_student_financial_adjustment(uuid, uuid) to service_role;
grant execute on function public.create_payment_phase_with_spps(text, uuid, numeric, numeric, integer, date, date) to service_role;
grant execute on function public.repair_missing_spp(uuid, uuid) to service_role;
grant execute on function public.transfer_student_payment_phase(uuid, uuid) to service_role;
grant execute on function public.cancel_payment_phase(uuid) to service_role;
