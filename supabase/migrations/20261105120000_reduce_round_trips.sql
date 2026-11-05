-- Fewer round trips for accounting pages and payment/adjustment mutations.
-- 1) Missing-prior-adjustment queue and students-without-class as single queries.
-- 2) Payment/adjustment write RPCs return the post-recalc SPP row (`spp`).
-- 3) Date-ranged net payment sum (credits - debits).

--------------------------------------------------
-- 1) Accounting list queries
--------------------------------------------------

create or replace function public.list_open_spps_missing_prior_adjustment(
  p_phase_ids uuid[]
)
returns table (
  spp_id uuid,
  student_id uuid,
  payment_phase_id uuid,
  spp_status text,
  student_profile_id uuid,
  full_name text,
  username text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    spp.id,
    spp.student_id,
    spp.payment_phase_id,
    spp.status::text,
    sp.id,
    sp.full_name,
    p.username
  from public.student_payment_phases spp
  left join public.student_profiles sp on sp.user_id = spp.student_id
  left join public.profiles p on p.id = spp.student_id
  where spp.payment_phase_id = any (p_phase_ids)
    and spp.status <> 'cancelled'
    and not exists (
      select 1
      from public.student_financial_adjustments own
      where own.student_payment_phase_id = spp.id
    )
    and exists (
      select 1
      from public.student_financial_adjustments prior
      join public.student_payment_phases other
        on other.id = prior.student_payment_phase_id
      where other.student_id = spp.student_id
        and other.id <> spp.id
    );
$$;

comment on function public.list_open_spps_missing_prior_adjustment(uuid[]) is
  'Non-cancelled SPPs on the given phases with no adjustment, where the student has an adjustment on another SPP.';

create or replace function public.list_student_profiles_without_active_class()
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  phone text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.id, sp.user_id, sp.full_name, sp.phone, sp.status::text
  from public.student_profiles sp
  where not exists (
    select 1
    from public.student_class sc
    join public.classes c on c.id = sc.class_id
    where sc.user_id = sp.user_id
      and c.status = 'in_progress'
  )
  order by sp.full_name;
$$;

comment on function public.list_student_profiles_without_active_class() is
  'Student profiles with no membership in an in-progress class (anti-join).';

revoke all on function public.list_open_spps_missing_prior_adjustment(uuid[]) from public;
revoke all on function public.list_open_spps_missing_prior_adjustment(uuid[]) from anon, authenticated;
grant execute on function public.list_open_spps_missing_prior_adjustment(uuid[]) to service_role;

revoke all on function public.list_student_profiles_without_active_class() from public;
revoke all on function public.list_student_profiles_without_active_class() from anon, authenticated;
grant execute on function public.list_student_profiles_without_active_class() to service_role;

--------------------------------------------------
-- 2) Payment writes return `spp`
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp.id;

  return jsonb_build_object(
    'deleted', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id,
    'spp', to_jsonb(v_spp)
  );
end;
$$;

--------------------------------------------------
-- 2b) Adjustment writes return `spp`
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp.id;

  return jsonb_build_object(
    'adjustment', to_jsonb(v_row),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id,
    'spp', to_jsonb(v_spp)
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp.id;

  return jsonb_build_object(
    'adjustment', to_jsonb(v_row),
    'previous', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id,
    'spp', to_jsonb(v_spp)
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

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp.id;

  return jsonb_build_object(
    'deleted', to_jsonb(v_existing),
    'studentPaymentPhaseId', v_spp.id,
    'paymentPhaseId', v_phase.id,
    'spp', to_jsonb(v_spp)
  );
end;
$$;

--------------------------------------------------
-- 3) Date-ranged net payment sum
--------------------------------------------------

create or replace function public.sum_student_payment_amounts_between(
  p_from date,
  p_to date
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round((
    coalesce(sum(amount) filter (where type = 'credit'), 0)
    - coalesce(sum(amount) filter (where type = 'debit'), 0)
  )::numeric, 2), 0)
  from public.student_payments
  where payment_date >= p_from
    and payment_date < p_to;
$$;

comment on function public.sum_student_payment_amounts_between(date, date) is
  'Net student_payments (credits - debits) with payment_date in [p_from, p_to).';

revoke all on function public.sum_student_payment_amounts_between(date, date) from public;
revoke all on function public.sum_student_payment_amounts_between(date, date) from anon, authenticated;
grant execute on function public.sum_student_payment_amounts_between(date, date) to service_role;
