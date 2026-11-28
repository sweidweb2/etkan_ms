-- Semester drop edge-case fixes:
-- 1) Leave paused classes on drop
-- 2) Prefer phase that actually has an SPP (avoid false NO_SPP wipe)
-- 3) Upsert withdrawn student_semester on complete
-- 4) Atomic batch immediate drops

--------------------------------------------------
-- 1) Leave scheduled / in_progress / paused (+ origin)
--------------------------------------------------

create or replace function public.leave_student_semester_drop_classes(
  p_student_id uuid,
  p_semester_id uuid,
  p_also_class_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed jsonb := '[]'::jsonb;
  v_class_id uuid;
begin
  if p_student_id is null or p_semester_id is null then
    raise exception 'Student and semester are required.';
  end if;

  with deleted as (
    delete from public.student_class sc
    using public.classes c
    where sc.class_id = c.id
      and sc.user_id = p_student_id
      and c.semester_id = p_semester_id
      and (
        c.status in ('scheduled', 'in_progress', 'paused')
        or (p_also_class_id is not null and c.id = p_also_class_id)
      )
    returning sc.class_id, sc.id as membership_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'classId', deleted.class_id,
        'membershipId', deleted.membership_id
      )
    ),
    '[]'::jsonb
  )
  into v_removed
  from deleted;

  for v_class_id in
    select distinct (item->>'classId')::uuid
    from jsonb_array_elements(v_removed) as item
  loop
    perform public.sync_student_left_class(p_student_id, v_class_id);
  end loop;

  return jsonb_build_object(
    'removed', v_removed,
    'removedCount', jsonb_array_length(v_removed)
  );
end;
$$;

comment on function public.leave_student_semester_drop_classes(uuid, uuid, uuid) is
  'On semester drop: remove student from all scheduled/in_progress/paused classes in the semester, plus optional originating class.';

--------------------------------------------------
-- 2) Resolve phase + SPP for a student/semester
--------------------------------------------------

create or replace function public.internal_resolve_semester_drop_spp(
  p_student_id uuid,
  p_semester_id uuid,
  out o_phase_id uuid,
  out o_spp_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prefer latest opened phase that has a non-cancelled SPP for this student.
  select pp.id, spp.id
  into o_phase_id, o_spp_id
  from public.payment_phases pp
  inner join public.student_payment_phases spp
    on spp.payment_phase_id = pp.id
   and spp.student_id = p_student_id
   and spp.status is distinct from 'cancelled'
  where pp.semester_id = p_semester_id
    and pp.status = 'opened'
  order by pp.created_at desc
  limit 1;

  if found then
    return;
  end if;

  -- Else latest closed phase with an SPP.
  select pp.id, spp.id
  into o_phase_id, o_spp_id
  from public.payment_phases pp
  inner join public.student_payment_phases spp
    on spp.payment_phase_id = pp.id
   and spp.student_id = p_student_id
   and spp.status is distinct from 'cancelled'
  where pp.semester_id = p_semester_id
    and pp.status = 'closed'
  order by pp.created_at desc
  limit 1;

  if found then
    return;
  end if;

  -- Else any non-cancelled SPP on this semester that has payments.
  select pp.id, spp.id
  into o_phase_id, o_spp_id
  from public.student_payment_phases spp
  inner join public.payment_phases pp
    on pp.id = spp.payment_phase_id
  where spp.student_id = p_student_id
    and spp.status is distinct from 'cancelled'
    and pp.semester_id = p_semester_id
    and pp.status is distinct from 'cancelled'
    and exists (
      select 1
      from public.student_payments sp
      where sp.student_payment_phase_id = spp.id
    )
  order by coalesce(spp.total_paid, 0) desc, spp.created_at desc
  limit 1;

  if found then
    return;
  end if;

  -- True no SPP: distinguish phase-exists vs no phase.
  if exists (
    select 1
    from public.payment_phases
    where semester_id = p_semester_id
      and status in ('opened', 'closed')
  ) then
    raise exception 'NO_SPP';
  end if;

  raise exception 'NO_SPP_PHASE';
end;
$$;

revoke all on function public.internal_resolve_semester_drop_spp(uuid, uuid) from public;

--------------------------------------------------
-- 3) complete: upsert withdrawn
--------------------------------------------------

create or replace function public.complete_semester_drop_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.semester_drop_requests;
  v_spp public.student_payment_phases;
  v_phase public.payment_phases;
  v_total_paid numeric(10,2);
  v_target numeric(10,2);
  v_settlement numeric(10,2);
  v_refund_owed numeric(10,2);
  v_leave jsonb;
  v_profile_id uuid;
  v_is_none boolean;
begin
  select * into v_req
  from public.semester_drop_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Drop request not found.';
  end if;

  if v_req.status = 'completed' then
    return jsonb_build_object('request', to_jsonb(v_req), 'alreadyCompleted', true);
  end if;

  if v_req.status is distinct from 'pending' then
    raise exception 'Only pending drop requests can be completed.';
  end if;

  if v_req.spp_id is null then
    raise exception 'Drop request has no student payment phase.';
  end if;

  select * into v_spp
  from public.student_payment_phases
  where id = v_req.spp_id
  for update;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
  end if;

  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
  v_total_paid := coalesce(v_spp.total_paid, 0);

  v_is_none := (
    v_req.restriction_mode = 'none'
    or coalesce(v_req.required_amount, 0) = 0
  );

  if not v_is_none and v_total_paid < v_req.required_amount then
    raise exception 'Student has not met the required drop amount.';
  end if;

  if v_is_none then
    v_target := v_total_paid;
  else
    v_target := v_req.required_amount;
  end if;

  v_settlement := round(
    greatest(coalesce(v_phase.amount, 0) - v_target, 0)::numeric,
    2
  );

  insert into public.student_financial_adjustments (
    student_payment_phase_id,
    type,
    value_type,
    value,
    reason,
    effective_date
  )
  values (
    v_spp.id,
    'manual_adjustment',
    'fixed',
    v_settlement,
    'Semester drop settlement',
    current_date
  )
  on conflict (student_payment_phase_id) do update
  set
    type = excluded.type,
    value_type = excluded.value_type,
    value = excluded.value,
    reason = excluded.reason,
    effective_date = excluded.effective_date,
    updated_at = now();

  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
  v_total_paid := coalesce(v_spp.total_paid, 0);

  if v_is_none then
    v_refund_owed := 0;
  else
    v_refund_owed := round(greatest(v_total_paid - v_req.required_amount, 0)::numeric, 2);
  end if;

  v_leave := public.leave_student_semester_drop_classes(
    v_req.student_id,
    v_req.semester_id,
    v_req.class_id
  );

  select id into v_profile_id
  from public.student_profiles
  where user_id = v_req.student_id;

  if v_profile_id is not null then
    insert into public.student_semester (
      student_profile_id,
      semester_id,
      status
    )
    values (
      v_profile_id,
      v_req.semester_id,
      'withdrawn'
    )
    on conflict (student_profile_id, semester_id) do update
    set status = 'withdrawn';
  end if;

  update public.semester_drop_requests
  set
    status = 'completed',
    completed_at = now(),
    refund_owed = v_refund_owed,
    refund_status = case
      when v_refund_owed > 0 then 'owed'
      else 'none'
    end,
    refunded_amount = 0,
    updated_at = now()
  where id = v_req.id
  returning * into v_req;

  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  select * into v_spp from public.student_payment_phases where id = v_spp.id;

  return jsonb_build_object(
    'request', to_jsonb(v_req),
    'spp', to_jsonb(v_spp),
    'membershipDeleted', coalesce((v_leave->>'removedCount')::int, 0) > 0,
    'removedClasses', coalesce(v_leave->'removed', '[]'::jsonb),
    'alreadyCompleted', false
  );
end;
$$;

comment on function public.complete_semester_drop_request(uuid) is
  'Complete pending drop: settle due (none→total_paid/no refund), leave semester classes, upsert withdrawn semester.';

--------------------------------------------------
-- 4) create: resolve SPP by semester (not latest phase alone)
--------------------------------------------------

create or replace function public.create_semester_drop_request(
  p_student_id uuid,
  p_class_id uuid,
  p_restriction_mode text default 'percent',
  p_required_percent numeric default null,
  p_required_amount numeric default null,
  p_requested_by uuid default null,
  p_notes text default null,
  p_require_immediate boolean default false
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
  v_phase_id uuid;
  v_spp_id uuid;
  v_mode text;
  v_percent numeric(5,2);
  v_base numeric(10,2);
  v_required numeric(10,2);
  v_deadline date;
  v_req public.semester_drop_requests;
  v_complete jsonb;
  v_will_complete boolean;
begin
  if p_student_id is null or p_class_id is null then
    raise exception 'Student and class are required.';
  end if;

  v_mode := lower(btrim(coalesce(p_restriction_mode, 'percent')));

  if v_mode not in ('percent', 'amount', 'none') then
    raise exception 'Invalid drop restriction mode.';
  end if;

  if v_mode = 'amount' and (p_required_amount is null or p_required_amount = 0) then
    v_mode := 'none';
  end if;
  if v_mode = 'percent' and p_required_percent is not null and p_required_percent = 0 then
    v_mode := 'none';
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

  select o_phase_id, o_spp_id
  into v_phase_id, v_spp_id
  from public.internal_resolve_semester_drop_spp(p_student_id, v_class.semester_id);

  select * into v_phase
  from public.payment_phases
  where id = v_phase_id;

  select * into v_spp
  from public.student_payment_phases
  where id = v_spp_id;

  if not found then
    raise exception 'NO_SPP';
  end if;

  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
  v_base := greatest(coalesce(v_spp.final_amount_due, v_phase.amount, 0), 0);

  if v_mode = 'none' then
    v_percent := null;
    v_required := 0;
  elsif v_mode = 'amount' then
    if p_required_amount is null then
      raise exception 'Required amount is required.';
    end if;
    if p_required_amount < 0 then
      raise exception 'Required amount must be at least 0.';
    end if;
    if p_required_amount > v_base then
      raise exception 'Required amount cannot exceed the amount due (%).', v_base;
    end if;
    v_required := round(p_required_amount::numeric, 2);
    v_percent := null;
    if v_required = 0 then
      v_mode := 'none';
    end if;
  else
    v_percent := round(coalesce(p_required_percent, 50)::numeric, 2);
    if v_percent <= 0 or v_percent > 100 then
      raise exception 'Required percent must be between 0 and 100.';
    end if;
    v_required := round((v_base * v_percent / 100.0)::numeric, 2);
  end if;

  v_deadline := (v_phase.start_date + interval '2 months')::date;
  v_will_complete := (
    v_mode = 'none'
    or coalesce(v_spp.total_paid, 0) >= v_required
  );

  if coalesce(p_require_immediate, false) and not v_will_complete then
    raise exception
      'Drop cannot complete immediately: paid % is below required %.',
      coalesce(v_spp.total_paid, 0),
      v_required;
  end if;

  insert into public.semester_drop_requests (
    student_id,
    semester_id,
    class_id,
    payment_phase_id,
    spp_id,
    status,
    restriction_mode,
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
    v_mode,
    v_percent,
    v_required,
    coalesce(v_phase.amount, 0),
    v_deadline,
    p_requested_by,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_req;

  if v_will_complete then
    v_complete := public.complete_semester_drop_request(v_req.id);
    return jsonb_build_object(
      'request', v_complete -> 'request',
      'completedImmediately', true,
      'spp', v_complete -> 'spp',
      'removedClasses', coalesce(v_complete -> 'removedClasses', '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'request', to_jsonb(v_req),
    'completedImmediately', false,
    'spp', to_jsonb(v_spp),
    'removedClasses', '[]'::jsonb
  );
end;
$$;

comment on function public.create_semester_drop_request(
  uuid, uuid, text, numeric, numeric, uuid, text, boolean
) is
  'Create semester drop with percent|amount|none. Resolves SPP by semester (opened→closed→paid). Auto-complete when paid>=required or none.';

revoke all on function public.create_semester_drop_request(
  uuid, uuid, text, numeric, numeric, uuid, text, boolean
) from public;
grant execute on function public.create_semester_drop_request(
  uuid, uuid, text, numeric, numeric, uuid, text, boolean
) to service_role;

--------------------------------------------------
-- 5) Atomic batch immediate drops
--------------------------------------------------

create or replace function public.create_immediate_semester_drops_batch(
  p_student_id uuid,
  p_class_ids uuid[],
  p_restriction_mode text default 'none',
  p_required_percent numeric default null,
  p_required_amount numeric default null,
  p_requested_by uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_one jsonb;
  v_count int := 0;
begin
  if p_student_id is null then
    raise exception 'Student is required.';
  end if;

  if p_class_ids is null or cardinality(p_class_ids) = 0 then
    raise exception 'At least one class is required.';
  end if;

  foreach v_class_id in array p_class_ids
  loop
    v_one := public.create_semester_drop_request(
      p_student_id,
      v_class_id,
      p_restriction_mode,
      p_required_percent,
      p_required_amount,
      p_requested_by,
      p_notes,
      true
    );

    if coalesce((v_one->>'completedImmediately')::boolean, false) is not true then
      raise exception
        'Drop for class % cannot complete immediately.',
        v_class_id;
    end if;

    v_results := v_results || jsonb_build_array(v_one);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'completedCount', v_count,
    'results', v_results
  );
end;
$$;

comment on function public.create_immediate_semester_drops_batch(
  uuid, uuid[], text, numeric, numeric, uuid, text
) is
  'Atomically create and immediately complete semester drops for each class_id. Any failure rolls back all.';

revoke all on function public.create_immediate_semester_drops_batch(
  uuid, uuid[], text, numeric, numeric, uuid, text
) from public;
grant execute on function public.create_immediate_semester_drops_batch(
  uuid, uuid[], text, numeric, numeric, uuid, text
) to service_role;
