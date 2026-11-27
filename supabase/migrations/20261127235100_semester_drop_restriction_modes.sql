-- Semester drop: restriction modes (percent | amount | none),
-- unrestricted complete (no refund; forgive remaining due),
-- and p_require_immediate for inactivate path.

--------------------------------------------------
-- 1) Table: restriction_mode + nullable percent
--------------------------------------------------

alter table public.semester_drop_requests
  drop constraint if exists semester_drop_requests_required_percent_check;

alter table public.semester_drop_requests
  alter column required_percent drop not null;

alter table public.semester_drop_requests
  add constraint semester_drop_requests_required_percent_check
  check (
    required_percent is null
    or (required_percent >= 0 and required_percent <= 100)
  );

alter table public.semester_drop_requests
  add column if not exists restriction_mode text;

update public.semester_drop_requests
set restriction_mode = case
  when required_amount = 0 then 'none'
  when required_percent is not null then 'percent'
  else 'amount'
end
where restriction_mode is null;

alter table public.semester_drop_requests
  alter column restriction_mode set default 'percent';

alter table public.semester_drop_requests
  alter column restriction_mode set not null;

alter table public.semester_drop_requests
  drop constraint if exists semester_drop_requests_restriction_mode_check;

alter table public.semester_drop_requests
  add constraint semester_drop_requests_restriction_mode_check
  check (restriction_mode in ('percent', 'amount', 'none'));

comment on column public.semester_drop_requests.restriction_mode is
  'percent | amount | none. none = immediate drop, keep payments, no refund.';

--------------------------------------------------
-- 2) complete: none/0 forgives remainder, no refund
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

  -- none/0: forgive remaining balance (final due → total_paid), never refund.
  -- otherwise: settle final due to required_amount; refund overpayment.
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
  'Complete pending drop: settle due (none→total_paid/no refund), leave semester classes, withdraw semester.';

--------------------------------------------------
-- 3) create: modes + require_immediate
--------------------------------------------------

drop function if exists public.create_semester_drop_request(uuid, uuid, numeric, uuid, text);

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

  -- Empty / 0 amount → none. Percent 0 → none.
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
    -- percent
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

comment on function public.create_semester_drop_request(
  uuid, uuid, text, numeric, numeric, uuid, text, boolean
) is
  'Create semester drop with percent|amount|none. Auto-complete when paid>=required or none. p_require_immediate refuses pending inserts.';

revoke all on function public.create_semester_drop_request(
  uuid, uuid, text, numeric, numeric, uuid, text, boolean
) from public;
grant execute on function public.create_semester_drop_request(
  uuid, uuid, text, numeric, numeric, uuid, text, boolean
) to service_role;
