-- Semester drop: leave all scheduled/in_progress classes in the semester
-- (plus the originating class), not only the class the drop was started from.

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
        c.status in ('scheduled', 'in_progress')
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
  'On semester drop: remove student from all scheduled/in_progress classes in the semester, plus optional originating class.';

revoke all on function public.leave_student_semester_drop_classes(uuid, uuid, uuid) from public;
grant execute on function public.leave_student_semester_drop_classes(uuid, uuid, uuid) to service_role;

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
  v_settlement numeric(10,2);
  v_refund_owed numeric(10,2);
  v_leave jsonb;
  v_profile_id uuid;
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

  -- Ensure money columns are current before gate / refund calc.
  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
  v_total_paid := coalesce(v_spp.total_paid, 0);

  if v_total_paid < v_req.required_amount then
    raise exception 'Student has not met the required drop amount.';
  end if;

  -- Settle final due to required_amount via fixed adjustment.
  v_settlement := round(
    greatest(coalesce(v_phase.amount, 0) - v_req.required_amount, 0)::numeric,
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

  v_refund_owed := round(greatest(v_total_paid - v_req.required_amount, 0)::numeric, 2);

  -- Leave all scheduled/in_progress classes in the semester (+ originating class).
  v_leave := public.leave_student_semester_drop_classes(
    v_req.student_id,
    v_req.semester_id,
    v_req.class_id
  );

  -- student_semester → withdrawn
  select id into v_profile_id
  from public.student_profiles
  where user_id = v_req.student_id;

  if v_profile_id is not null then
    update public.student_semester
    set status = 'withdrawn'
    where student_profile_id = v_profile_id
      and semester_id = v_req.semester_id;
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
  'Complete pending drop: settle due, leave all scheduled/in_progress semester classes, keep SPP, set refund_owed, semester withdrawn.';
