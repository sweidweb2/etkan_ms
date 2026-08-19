-- Phase 11–13: SPP ensure, class in_progress backfill, set-based recalc.
-- Reuses internal_recalc_student_payment_phase and
-- internal_recalc_payment_phase_status_from_spps.

--------------------------------------------------
-- Phase 11: sync target + ensure SPP
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
  'Billing sync target for a class: semester in-progress class only; opened phase else latest closed.';

create or replace function public.ensure_spp_for_student_on_phase(
  p_student_id uuid,
  p_phase_id uuid,
  p_assigned_at date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase public.payment_phases;
  v_spp public.student_payment_phases;
  v_created boolean := false;
  v_reactivated boolean := false;
  v_already boolean := false;
  v_original numeric(10,2);
  v_status text;
begin
  select * into v_phase
  from public.payment_phases
  where id = p_phase_id;

  if not found then
    raise exception 'Payment phase not found.';
  end if;

  select * into v_spp
  from public.student_payment_phases
  where student_id = p_student_id
    and payment_phase_id = p_phase_id;

  if found then
    v_already := true;
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
        p_phase_id,
        coalesce(p_assigned_at, current_date),
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
          and payment_phase_id = p_phase_id;

        v_already := true;
        if v_spp.status = 'cancelled' then
          update public.student_payment_phases
          set status = 'pending', updated_at = now()
          where id = v_spp.id;

          v_spp := public.internal_recalc_student_payment_phase(v_spp.id);
          v_reactivated := true;
        end if;
    end;
  end if;

  return jsonb_build_object(
    'spp', to_jsonb(v_spp),
    'created', v_created,
    'alreadyExisted', v_already,
    'reactivated', v_reactivated
  );
end;
$$;

comment on function public.ensure_spp_for_student_on_phase(uuid, uuid, date) is
  'Create SPP if missing; reactivate cancelled via internal_recalc. Existing non-cancelled rows stay.';

--------------------------------------------------
-- Phase 12: in_progress backfill
--------------------------------------------------

create or replace function public.backfill_spps_for_class_become_in_progress(
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phase public.payment_phases;
  v_was_closed boolean := false;
  v_student_id uuid;
  v_item jsonb;
  v_ensured integer := 0;
  v_created integer := 0;
  v_reactivated integer := 0;
  v_created_rows jsonb := '[]'::jsonb;
  v_reactivated_rows jsonb := '[]'::jsonb;
begin
  v_phase := public.find_sync_target_phase_for_class(p_class_id);

  if v_phase is null or v_phase.status = 'cancelled' then
    return jsonb_build_object(
      'phase', null,
      'ensuredCount', 0,
      'createdCount', 0,
      'reactivatedCount', 0,
      'created', v_created_rows,
      'reactivated', v_reactivated_rows
    );
  end if;

  v_was_closed := v_phase.status = 'closed';

  for v_student_id in
    select distinct sc.user_id
    from public.student_class sc
    where sc.class_id = p_class_id
  loop
    v_ensured := v_ensured + 1;
    v_item := public.ensure_spp_for_student_on_phase(v_student_id, v_phase.id, current_date);

    if coalesce((v_item ->> 'created')::boolean, false) then
      v_created := v_created + 1;
      v_created_rows := v_created_rows || jsonb_build_array(v_item -> 'spp');
    elsif coalesce((v_item ->> 'reactivated')::boolean, false) then
      v_reactivated := v_reactivated + 1;
      v_reactivated_rows := v_reactivated_rows || jsonb_build_array(v_item -> 'spp');
    end if;
  end loop;

  if v_ensured > 0 then
    if v_was_closed and (v_created > 0 or v_reactivated > 0) then
      update public.payment_phases
      set status = 'opened', updated_at = now()
      where id = v_phase.id;
    end if;

    perform public.internal_recalc_payment_phase_status_from_spps(v_phase.id);
  end if;

  select * into v_phase from public.payment_phases where id = v_phase.id;

  return jsonb_build_object(
    'phase', to_jsonb(v_phase),
    'ensuredCount', v_ensured,
    'createdCount', v_created,
    'reactivatedCount', v_reactivated,
    'created', v_created_rows,
    'reactivated', v_reactivated_rows
  );
end;
$$;

comment on function public.backfill_spps_for_class_become_in_progress(uuid) is
  'Ensure SPPs for all enrolled students when a class becomes in_progress. One transaction.';

--------------------------------------------------
-- Phase 13: SPP + phase recalc
--------------------------------------------------

create or replace function public.recalc_spp_and_phase_status(
  p_spp_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_status text;
begin
  v_spp := public.internal_recalc_student_payment_phase(p_spp_id);
  v_status := public.internal_recalc_payment_phase_status_from_spps(v_spp.payment_phase_id);

  return jsonb_build_object(
    'spp', to_jsonb(v_spp),
    'phaseStatus', v_status
  );
end;
$$;

create or replace function public.recalc_non_cancelled_spps_for_phase(
  p_phase_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spp public.student_payment_phases;
  v_count integer := 0;
  v_status text;
begin
  if not exists (select 1 from public.payment_phases where id = p_phase_id) then
    raise exception 'Payment phase not found.';
  end if;

  for v_spp in
    select *
    from public.student_payment_phases
    where payment_phase_id = p_phase_id
      and status is distinct from 'cancelled'
  loop
    perform public.internal_recalc_student_payment_phase(v_spp.id);
    v_count := v_count + 1;
  end loop;

  v_status := public.internal_recalc_payment_phase_status_from_spps(p_phase_id);

  return jsonb_build_object(
    'sppRecalculated', v_count,
    'nextPhaseStatus', v_status
  );
end;
$$;

comment on function public.recalc_spp_and_phase_status(uuid) is
  'Recalculate one SPP then its parent phase status in one transaction.';

comment on function public.recalc_non_cancelled_spps_for_phase(uuid) is
  'Recalculate every non-cancelled SPP on a phase, then derive phase status.';

revoke all on function public.find_sync_target_phase_for_class(uuid) from public;
revoke all on function public.ensure_spp_for_student_on_phase(uuid, uuid, date) from public;
revoke all on function public.backfill_spps_for_class_become_in_progress(uuid) from public;
revoke all on function public.recalc_spp_and_phase_status(uuid) from public;
revoke all on function public.recalc_non_cancelled_spps_for_phase(uuid) from public;

grant execute on function public.find_sync_target_phase_for_class(uuid) to service_role;
grant execute on function public.ensure_spp_for_student_on_phase(uuid, uuid, date) to service_role;
grant execute on function public.backfill_spps_for_class_become_in_progress(uuid) to service_role;
grant execute on function public.recalc_spp_and_phase_status(uuid) to service_role;
grant execute on function public.recalc_non_cancelled_spps_for_phase(uuid) to service_role;
