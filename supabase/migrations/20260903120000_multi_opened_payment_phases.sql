-- Allow multiple opened payment phases per semester.
-- Sync attaches late joins to the latest-created opened phase (else latest closed).
-- SPP transfer cannot target another phase on the same semester.

drop index if exists public.payment_phases_one_opened_per_semester;

--------------------------------------------------
-- Sync target: prefer latest opened by created_at
--------------------------------------------------

create or replace function public.find_sync_target_phase_for_class(
  p_class_id uuid
)
returns public.payment_phases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semester_id uuid;
  v_billing_class_id uuid;
  v_phase public.payment_phases;
begin
  select semester_id into v_semester_id
  from public.classes
  where id = p_class_id;

  if v_semester_id is null then
    return null;
  end if;

  select id into v_billing_class_id
  from public.classes
  where semester_id = v_semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  if v_billing_class_id is distinct from p_class_id then
    return null;
  end if;

  select * into v_phase
  from public.payment_phases
  where semester_id = v_semester_id
    and status = 'opened'
  order by created_at desc
  limit 1;

  if not found then
    select * into v_phase
    from public.payment_phases
    where semester_id = v_semester_id
      and status = 'closed'
    order by created_at desc
    limit 1;
  end if;

  if not found or v_phase.status = 'cancelled' then
    return null;
  end if;

  return v_phase;
end;
$$;

comment on function public.find_sync_target_phase_for_class(uuid) is
  'Billing sync target for a class: semester in-progress class only; latest opened phase else latest closed.';

--------------------------------------------------
-- Create phase: allow second opened on same semester
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
-- Join sync: latest opened by created_at
--------------------------------------------------

create or replace function public.sync_student_joined_class(
  p_student_id uuid,
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semester_id uuid;
  v_billing_class_id uuid;
  v_phase public.payment_phases;
  v_spp public.student_payment_phases;
  v_created boolean := false;
  v_reactivated boolean := false;
  v_phase_reopened boolean := false;
  v_was_closed boolean := false;
  v_original numeric(10,2);
  v_status text;
  v_empty jsonb := jsonb_build_object(
    'phase', null,
    'spp', null,
    'created', false,
    'reactivated', false,
    'phaseReopened', false
  );
begin
  select semester_id into v_semester_id
  from public.classes
  where id = p_class_id;

  if v_semester_id is null then
    return v_empty;
  end if;

  select id into v_billing_class_id
  from public.classes
  where semester_id = v_semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  if v_billing_class_id is distinct from p_class_id then
    return v_empty;
  end if;

  select * into v_phase
  from public.payment_phases
  where semester_id = v_semester_id
    and status = 'opened'
  order by created_at desc
  limit 1;

  if not found then
    select * into v_phase
    from public.payment_phases
    where semester_id = v_semester_id
      and status = 'closed'
    order by created_at desc
    limit 1;
  end if;

  if not found or v_phase.status = 'cancelled' then
    return v_empty;
  end if;

  v_was_closed := v_phase.status = 'closed';

  select * into v_spp
  from public.student_payment_phases
  where student_id = p_student_id
    and payment_phase_id = v_phase.id;

  if found then
    if v_spp.status = 'cancelled' then
      update public.student_payment_phases
      set status = 'pending', updated_at = now()
      where id = v_spp.id;

      v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
      v_reactivated := true;
    end if;
  else
    v_original := round(greatest(coalesce(v_phase.amount, 0), 0)::numeric, 2);
    if v_original > 0 then
      v_status := 'pending';
    else
      v_status := 'paid';
    end if;

    begin
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
      values (
        p_student_id,
        v_phase.id,
        current_date,
        v_status,
        v_original,
        0,
        v_original,
        0,
        v_original
      )
      returning * into v_spp;
      v_created := true;
    exception
      when unique_violation then
        select * into v_spp
        from public.student_payment_phases
        where student_id = p_student_id
          and payment_phase_id = v_phase.id;

        if v_spp.status = 'cancelled' then
          update public.student_payment_phases
          set status = 'pending', updated_at = now()
          where id = v_spp.id;

          v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
          v_reactivated := true;
        end if;
    end;
  end if;

  if v_was_closed and (
    v_created
    or v_reactivated
    or (
      v_spp is not null
      and v_spp.status is distinct from 'paid'
      and v_spp.status is distinct from 'cancelled'
    )
  ) then
    update public.payment_phases
    set status = 'opened', updated_at = now()
    where id = v_phase.id;

    v_phase.status := 'opened';
    v_phase_reopened := true;
  end if;

  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  select * into v_phase from public.payment_phases where id = v_phase.id;
  if v_spp.id is not null then
    select * into v_spp from public.student_payment_phases where id = v_spp.id;
  end if;

  return jsonb_build_object(
    'phase', to_jsonb(v_phase),
    'spp', to_jsonb(v_spp),
    'created', v_created,
    'reactivated', v_reactivated,
    'phaseReopened', v_phase_reopened
  );
end;
$$;

comment on function public.sync_student_joined_class(uuid, uuid) is
  'One-transaction payment sync when a student joins a class (SPP on latest opened/closed phase + phase recalc).';

--------------------------------------------------
-- Leave sync: latest opened by created_at
--------------------------------------------------

create or replace function public.sync_student_left_class(
  p_student_id uuid,
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semester_id uuid;
  v_billing_class_id uuid;
  v_phase public.payment_phases;
  v_spp public.student_payment_phases;
  v_empty jsonb := jsonb_build_object(
    'phase', null,
    'spp', null,
    'retained', false
  );
begin
  select semester_id into v_semester_id
  from public.classes
  where id = p_class_id;

  if v_semester_id is null then
    return v_empty;
  end if;

  select id into v_billing_class_id
  from public.classes
  where semester_id = v_semester_id
    and status = 'in_progress'
  order by created_at asc
  limit 1;

  if v_billing_class_id is distinct from p_class_id then
    return v_empty;
  end if;

  select * into v_phase
  from public.payment_phases
  where semester_id = v_semester_id
    and status = 'opened'
  order by created_at desc
  limit 1;

  if not found then
    select * into v_phase
    from public.payment_phases
    where semester_id = v_semester_id
      and status = 'closed'
    order by created_at desc
    limit 1;
  end if;

  if not found or v_phase.status = 'cancelled' then
    return v_empty;
  end if;

  select * into v_spp
  from public.student_payment_phases
  where student_id = p_student_id
    and payment_phase_id = v_phase.id;

  if not found then
    return jsonb_build_object(
      'phase', to_jsonb(v_phase),
      'spp', null,
      'retained', false
    );
  end if;

  if v_spp.status = 'cancelled' then
    return jsonb_build_object(
      'phase', to_jsonb(v_phase),
      'spp', to_jsonb(v_spp),
      'retained', false
    );
  end if;

  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  select * into v_phase from public.payment_phases where id = v_phase.id;
  select * into v_spp from public.student_payment_phases where id = v_spp.id;

  return jsonb_build_object(
    'phase', to_jsonb(v_phase),
    'spp', to_jsonb(v_spp),
    'retained', true
  );
end;
$$;

comment on function public.sync_student_left_class(uuid, uuid) is
  'One-transaction payment sync when a student leaves a class. Keeps SPP; recalcs latest sync-target phase status.';

--------------------------------------------------
-- Transfer: reject same-semester destination
--------------------------------------------------

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

comment on function public.transfer_student_payment_phase(uuid, uuid) is
  'Move an SPP to a different payment phase. Destination must be opened/closed and a different semester.';
