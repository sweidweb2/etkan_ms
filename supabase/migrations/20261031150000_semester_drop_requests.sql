-- Drop semester: table, student_payments credit/debit, recalc net paid, drop RPCs.

--------------------------------------------------
-- 1) semester_drop_requests
--------------------------------------------------

create table public.semester_drop_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  payment_phase_id uuid references public.payment_phases (id) on delete set null,
  spp_id uuid references public.student_payment_phases (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  required_percent numeric(5,2) not null
    check (required_percent > 0 and required_percent <= 100),
  required_amount numeric(10,2) not null
    check (required_amount >= 0),
  phase_amount_snapshot numeric(10,2) not null
    check (phase_amount_snapshot >= 0),
  requested_at timestamptz not null default now(),
  deadline_at date not null,
  completed_at timestamptz,
  refund_owed numeric(10,2) not null default 0
    check (refund_owed >= 0),
  refund_status text not null default 'none'
    check (refund_status in ('none', 'owed', 'processed')),
  refunded_amount numeric(10,2) not null default 0
    check (refunded_amount >= 0),
  requested_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.semester_drop_requests is
  'Drop-semester lifecycle. Class membership stays binary on student_class.';

create unique index semester_drop_requests_one_pending_per_student_semester
  on public.semester_drop_requests (student_id, semester_id)
  where status = 'pending';

create index idx_semester_drop_requests_class
  on public.semester_drop_requests (class_id);

create index idx_semester_drop_requests_spp
  on public.semester_drop_requests (spp_id);

create index idx_semester_drop_requests_status
  on public.semester_drop_requests (status);

create index idx_semester_drop_requests_refund_status
  on public.semester_drop_requests (refund_status);

create index idx_semester_drop_requests_student_semester
  on public.semester_drop_requests (student_id, semester_id);

--------------------------------------------------
-- 2) student_payments type + drop FK
--------------------------------------------------

alter table public.student_payments
  add column if not exists type text;

update public.student_payments
set type = 'credit'
where type is null;

alter table public.student_payments
  alter column type set default 'credit';

alter table public.student_payments
  alter column type set not null;

alter table public.student_payments
  drop constraint if exists student_payments_type_check;

alter table public.student_payments
  add constraint student_payments_type_check
  check (type in ('credit', 'debit'));

alter table public.student_payments
  add column if not exists semester_drop_request_id uuid;

alter table public.student_payments
  drop constraint if exists student_payments_semester_drop_request_id_fkey;

alter table public.student_payments
  add constraint student_payments_semester_drop_request_id_fkey
  foreign key (semester_drop_request_id)
  references public.semester_drop_requests (id)
  on delete set null;

create index if not exists idx_student_payments_type
  on public.student_payments (type);

create index if not exists idx_student_payments_drop_request
  on public.student_payments (semester_drop_request_id);

comment on column public.student_payments.type is
  'credit = student paid school; debit = school refunded student (drop refund).';

comment on column public.student_payments.semester_drop_request_id is
  'Set on drop-refund debit rows.';

--------------------------------------------------
-- 3) Net paid helper + recalc
--------------------------------------------------

create or replace function public.spp_net_total_paid(p_spp_id uuid)
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
  where student_payment_phase_id = p_spp_id;
$$;

comment on function public.spp_net_total_paid(uuid) is
  'SPP net paid: sum(credits) - sum(debits).';

revoke all on function public.spp_net_total_paid(uuid) from public;
grant execute on function public.spp_net_total_paid(uuid) to service_role;

create or replace function public.internal_recalc_student_payment_phase(
  p_spp_id uuid
)
returns public.student_payment_phases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_phase_amount numeric(10,2);
  v_adj_type text;
  v_adj_value numeric(10,2);
  v_original numeric(10,2);
  v_adjustment numeric(10,2);
  v_final_due numeric(10,2);
  v_total_paid numeric(10,2);
  v_remaining numeric(10,2);
  v_status text;
begin
  select * into v_spp
  from public.student_payment_phases
  where id = p_spp_id;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  if v_spp.status = 'cancelled' then
    return v_spp;
  end if;

  select amount into v_phase_amount
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
  end if;

  v_original := round(greatest(coalesce(v_phase_amount, 0), 0)::numeric, 2);

  select value_type, value
  into v_adj_type, v_adj_value
  from public.student_financial_adjustments
  where student_payment_phase_id = v_spp.id
  order by created_at desc
  limit 1;

  v_adjustment := 0;
  if v_adj_type is not null then
    if v_adj_type = 'percentage' then
      v_adjustment := round(
        v_original * (least(greatest(coalesce(v_adj_value, 0), 0), 100) / 100.0),
        2
      );
    else
      v_adjustment := round(greatest(coalesce(v_adj_value, 0), 0)::numeric, 2);
    end if;
  end if;

  v_final_due := round(greatest(v_original - v_adjustment, 0)::numeric, 2);

  v_total_paid := public.spp_net_total_paid(v_spp.id);

  v_remaining := round((v_final_due - v_total_paid)::numeric, 2);

  if v_total_paid <= 0 and v_final_due > 0 then
    v_status := 'pending';
  elsif v_remaining > 0 then
    v_status := 'partially_paid';
  else
    v_status := 'paid';
  end if;

  update public.student_payment_phases
  set
    status = v_status,
    original_amount = v_original,
    adjustment_amount = v_adjustment,
    final_amount_due = v_final_due,
    total_paid = v_total_paid,
    remaining_amount = v_remaining,
    updated_at = now()
  where id = v_spp.id
  returning * into v_spp;

  return v_spp;
end;
$$;

--------------------------------------------------
-- 4) sum_student_payment_amounts → net + breakdown helpers
--------------------------------------------------

create or replace function public.sum_student_payment_amounts()
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
  from public.student_payments;
$$;

comment on function public.sum_student_payment_amounts() is
  'All-time net student_payments (credits - debits) for income-statement totals.';

create or replace function public.sum_student_payment_amounts_by_type()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'credits', coalesce(sum(amount) filter (where type = 'credit'), 0),
    'debits', coalesce(sum(amount) filter (where type = 'debit'), 0),
    'net', coalesce(sum(amount) filter (where type = 'credit'), 0)
      - coalesce(sum(amount) filter (where type = 'debit'), 0)
  )
  from public.student_payments;
$$;

comment on function public.sum_student_payment_amounts_by_type() is
  'All-time student_payments credits, debits, and net.';

revoke all on function public.sum_student_payment_amounts_by_type() from public;
grant execute on function public.sum_student_payment_amounts_by_type() to service_role;

--------------------------------------------------
-- 5) complete / try_complete / create / cancel / debit refund
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
  v_settlement numeric(10,2);
  v_refund_owed numeric(10,2);
  v_membership public.student_class;
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

  -- Leave class (binary membership delete).
  delete from public.student_class
  where user_id = v_req.student_id
    and class_id = v_req.class_id
  returning * into v_membership;

  perform public.sync_student_left_class(v_req.student_id, v_req.class_id);

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
    'membershipDeleted', v_membership is not null,
    'alreadyCompleted', false
  );
end;
$$;

comment on function public.complete_semester_drop_request(uuid) is
  'Complete pending drop: settle due, leave class, keep SPP, set refund_owed, semester withdrawn.';

create or replace function public.try_complete_semester_drop_for_spp(
  p_spp_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.semester_drop_requests;
  v_spp public.student_payment_phases;
begin
  select * into v_req
  from public.semester_drop_requests
  where spp_id = p_spp_id
    and status = 'pending'
  order by requested_at asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('completed', false, 'request', null);
  end if;

  select * into v_spp
  from public.student_payment_phases
  where id = p_spp_id;

  if not found then
    return jsonb_build_object('completed', false, 'request', to_jsonb(v_req));
  end if;

  -- Recalc first so total_paid is current.
  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);

  if coalesce(v_spp.total_paid, 0) < v_req.required_amount then
    return jsonb_build_object('completed', false, 'request', to_jsonb(v_req));
  end if;

  return public.complete_semester_drop_request(v_req.id)
    || jsonb_build_object('completed', true);
end;
$$;

comment on function public.try_complete_semester_drop_for_spp(uuid) is
  'If a pending drop exists for the SPP and paid >= required, complete it.';

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

  -- Prefer opened phase for semester, else closed (same idea as sync target, but not limited to billing class).
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

  v_required := round((coalesce(v_phase.amount, 0) * v_percent / 100.0)::numeric, 2);
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
  'Create pending semester drop; auto-complete when already paid >= required.';

create or replace function public.cancel_semester_drop_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.semester_drop_requests;
begin
  select * into v_req
  from public.semester_drop_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Drop request not found.';
  end if;

  if v_req.status is distinct from 'pending' then
    raise exception 'Only pending drop requests can be cancelled.';
  end if;

  update public.semester_drop_requests
  set
    status = 'cancelled',
    updated_at = now()
  where id = v_req.id
  returning * into v_req;

  return jsonb_build_object('request', to_jsonb(v_req));
end;
$$;

comment on function public.cancel_semester_drop_request(uuid) is
  'Cancel a pending drop request (no pipeline side effects yet).';

create or replace function public.create_student_payment_debit_for_drop_refund(
  p_drop_request_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_received_by text,
  p_received_by_management boolean default false,
  p_notes text default null
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
  v_remaining_owed numeric(10,2);
  v_payment public.student_payments;
  v_new_refunded numeric(10,2);
begin
  select * into v_req
  from public.semester_drop_requests
  where id = p_drop_request_id
  for update;

  if not found then
    raise exception 'Drop request not found.';
  end if;

  if v_req.status is distinct from 'completed' then
    raise exception 'Refunds are only allowed on completed drop requests.';
  end if;

  if v_req.refund_status is distinct from 'owed' then
    raise exception 'This drop request does not owe a refund.';
  end if;

  if v_req.spp_id is null then
    raise exception 'Drop request has no student payment phase.';
  end if;

  v_remaining_owed := round(
    greatest(coalesce(v_req.refund_owed, 0) - coalesce(v_req.refunded_amount, 0), 0)::numeric,
    2
  );

  if p_amount is null or p_amount <= 0 or p_amount > v_remaining_owed then
    raise exception 'Refund amount must be greater than 0 and at most the remaining refund owed.';
  end if;

  select * into v_spp
  from public.student_payment_phases
  where id = v_req.spp_id;

  if not found then
    raise exception 'Student payment phase not found.';
  end if;

  select * into v_phase
  from public.payment_phases
  where id = v_spp.payment_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
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
    notes,
    semester_drop_request_id
  )
  values (
    v_spp.id,
    p_payment_date,
    p_amount,
    'debit',
    p_payment_method,
    p_received_by,
    coalesce(p_received_by_management, false),
    null,
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_req.id
  )
  returning * into v_payment;

  v_new_refunded := round(
    (coalesce(v_req.refunded_amount, 0) + p_amount)::numeric,
    2
  );

  update public.semester_drop_requests
  set
    refunded_amount = v_new_refunded,
    refund_status = case
      when v_new_refunded >= coalesce(v_req.refund_owed, 0) then 'processed'
      else 'owed'
    end,
    updated_at = now()
  where id = v_req.id
  returning * into v_req;

  v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
  perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'request', to_jsonb(v_req),
    'spp', to_jsonb(v_spp),
    'paymentPhaseId', v_phase.id
  );
end;
$$;

comment on function public.create_student_payment_debit_for_drop_refund(uuid, numeric, date, text, text, boolean, text) is
  'Record a drop-refund debit payment and reduce refund owed on the drop request.';

--------------------------------------------------
-- 6) Hook try_complete into credit payment writes
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
-- Grants
--------------------------------------------------

revoke all on function public.complete_semester_drop_request(uuid) from public;
revoke all on function public.try_complete_semester_drop_for_spp(uuid) from public;
revoke all on function public.create_semester_drop_request(uuid, uuid, numeric, uuid, text) from public;
revoke all on function public.cancel_semester_drop_request(uuid) from public;
revoke all on function public.create_student_payment_debit_for_drop_refund(uuid, numeric, date, text, text, boolean, text) from public;

grant execute on function public.complete_semester_drop_request(uuid) to service_role;
grant execute on function public.try_complete_semester_drop_for_spp(uuid) to service_role;
grant execute on function public.create_semester_drop_request(uuid, uuid, numeric, uuid, text) to service_role;
grant execute on function public.cancel_semester_drop_request(uuid) to service_role;
grant execute on function public.create_student_payment_debit_for_drop_refund(uuid, numeric, date, text, text, boolean, text) to service_role;
