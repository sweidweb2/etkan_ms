-- Late-join enrollment: one round-trip for attendees, student_tasks, and payment sync.
-- student_tasks needs (task_id, student_id) uniqueness so inserts can be ON CONFLICT DO NOTHING.

delete from public.student_tasks a
using public.student_tasks b
where a.task_id = b.task_id
  and a.student_id = b.student_id
  and a.id > b.id;

alter table public.student_tasks
  drop constraint if exists student_tasks_task_student_unique;

alter table public.student_tasks
  add constraint student_tasks_task_student_unique unique (task_id, student_id);

comment on constraint student_tasks_task_student_unique on public.student_tasks is
  'One student_tasks row per student per task; required for idempotent late-join inserts.';

--------------------------------------------------
-- Attendees
--------------------------------------------------

create or replace function public.seed_late_join_attendees(
  p_class_id uuid,
  p_student_id uuid
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.attendee (session_id, student_id, status, note)
    select
      s.id,
      p_student_id,
      'absent',
      'he entered late to this class'
    from public.sessions s
    where s.class_id = p_class_id
    on conflict (session_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.seed_late_join_attendees(uuid, uuid) is
  'Idempotent: absent attendee rows with late-join note for every class session.';

--------------------------------------------------
-- Student tasks
--------------------------------------------------

create or replace function public.seed_late_join_student_tasks(
  p_class_id uuid,
  p_student_id uuid
)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.student_tasks (
      task_id,
      student_id,
      status,
      grade,
      notes
    )
    select
      t.id,
      p_student_id,
      case
        when t.due_date is not null and t.due_date < now() then 'missing'
        else 'pending'
      end,
      case
        when t.due_date is not null and t.due_date < now() then 0
        else null
      end,
      case
        when t.due_date is not null and t.due_date < now() then 'he entered late to this class'
        else null
      end
    from public.sessions s
    join public.tasks t on t.session_id = s.id
    where s.class_id = p_class_id
    on conflict (task_id, student_id) do nothing
    returning id
  )
  select count(*)::integer from inserted;
$$;

comment on function public.seed_late_join_student_tasks(uuid, uuid) is
  'Idempotent: student_task rows for class tasks. Past-due → missing + grade 0 + late note.';

--------------------------------------------------
-- Payment join sync helpers (not granted to API roles)
--------------------------------------------------

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

  select coalesce(round(sum(greatest(amount, 0))::numeric, 2), 0)
  into v_total_paid
  from public.student_payments
  where student_payment_phase_id = v_spp.id;

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

create or replace function public.internal_recalc_payment_phase_status_from_spps(
  p_phase_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_next text;
  v_active_count integer;
  v_unpaid_count integer;
begin
  select status into v_current
  from public.payment_phases
  where id = p_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
  end if;

  if v_current is distinct from 'opened'
     and v_current is distinct from 'closed'
     and v_current is distinct from 'cancelled' then
    v_current := 'opened';
  end if;

  if v_current = 'cancelled' then
    return v_current;
  end if;

  select
    count(*) filter (where status is distinct from 'cancelled'),
    count(*) filter (
      where status is distinct from 'cancelled'
        and status is distinct from 'paid'
    )
  into v_active_count, v_unpaid_count
  from public.student_payment_phases
  where payment_phase_id = p_phase_id;

  if v_active_count = 0 then
    v_next := 'opened';
  elsif v_unpaid_count = 0 then
    v_next := 'closed';
  else
    v_next := 'opened';
  end if;

  if v_next is distinct from v_current then
    update public.payment_phases
    set status = v_next, updated_at = now()
    where id = p_phase_id;
  end if;

  return v_next;
end;
$$;

--------------------------------------------------
-- Payment join sync
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
  'One-transaction payment sync when a student joins a class (SPP ensure + phase recalc).';

revoke all on function public.seed_late_join_attendees(uuid, uuid) from public;
revoke all on function public.seed_late_join_student_tasks(uuid, uuid) from public;
revoke all on function public.sync_student_joined_class(uuid, uuid) from public;
revoke all on function public.internal_recalc_student_payment_phase(uuid) from public;
revoke all on function public.internal_recalc_payment_phase_status_from_spps(uuid) from public;

grant execute on function public.seed_late_join_attendees(uuid, uuid) to service_role;
grant execute on function public.seed_late_join_student_tasks(uuid, uuid) to service_role;
grant execute on function public.sync_student_joined_class(uuid, uuid) to service_role;
