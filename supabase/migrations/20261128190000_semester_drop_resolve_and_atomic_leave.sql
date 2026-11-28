-- Align drop SPP resolve with paid preference; atomic no-SPP leave+withdraw.

--------------------------------------------------
-- 1) Prefer paid opened SPP, then any opened SPP, then closed, then paid any
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
  -- Prefer latest opened phase with a paid non-cancelled SPP.
  select pp.id, spp.id
  into o_phase_id, o_spp_id
  from public.payment_phases pp
  inner join public.student_payment_phases spp
    on spp.payment_phase_id = pp.id
   and spp.student_id = p_student_id
   and spp.status is distinct from 'cancelled'
  where pp.semester_id = p_semester_id
    and pp.status = 'opened'
    and exists (
      select 1
      from public.student_payments sp
      where sp.student_payment_phase_id = spp.id
    )
  order by pp.created_at desc
  limit 1;

  if found then
    return;
  end if;

  -- Else latest opened phase with any non-cancelled SPP.
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

--------------------------------------------------
-- 2) Atomic leave + withdraw for true no-SPP drops
--------------------------------------------------

create or replace function public.leave_and_withdraw_semester_no_spp(
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
  v_leave jsonb;
  v_profile_id uuid;
begin
  if p_student_id is null or p_semester_id is null then
    raise exception 'Student and semester are required.';
  end if;

  select id into v_profile_id
  from public.student_profiles
  where user_id = p_student_id;

  if v_profile_id is null then
    raise exception 'Student profile not found; cannot withdraw semester enrollment.';
  end if;

  v_leave := public.leave_student_semester_drop_classes(
    p_student_id,
    p_semester_id,
    p_also_class_id
  );

  if coalesce((v_leave->>'removedCount')::int, 0) < 1 then
    raise exception 'Student is not a member of this class.';
  end if;

  insert into public.student_semester (
    student_profile_id,
    semester_id,
    status
  )
  values (
    v_profile_id,
    p_semester_id,
    'withdrawn'
  )
  on conflict (student_profile_id, semester_id) do update
  set status = 'withdrawn';

  return v_leave;
end;
$$;

comment on function public.leave_and_withdraw_semester_no_spp(uuid, uuid, uuid) is
  'Atomic no-SPP semester drop: leave scheduled/in_progress/paused (+origin), upsert withdrawn.';

revoke all on function public.leave_and_withdraw_semester_no_spp(uuid, uuid, uuid) from public;
grant execute on function public.leave_and_withdraw_semester_no_spp(uuid, uuid, uuid) to service_role;

--------------------------------------------------
-- 3) Batch immediate drops: NO_SPP → atomic leave+withdraw
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
  v_class public.classes;
  v_results jsonb := '[]'::jsonb;
  v_one jsonb;
  v_leave jsonb;
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
    begin
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
    exception
      when others then
        if sqlerrm like '%NO_SPP%' then
          select * into v_class
          from public.classes
          where id = v_class_id;

          if not found or v_class.semester_id is null then
            raise;
          end if;

          v_leave := public.leave_and_withdraw_semester_no_spp(
            p_student_id,
            v_class.semester_id,
            v_class_id
          );

          v_one := jsonb_build_object(
            'request', null,
            'completedImmediately', true,
            'spp', null,
            'removedClasses', coalesce(v_leave->'removed', '[]'::jsonb),
            'noSppFallback', true
          );
          v_results := v_results || jsonb_build_array(v_one);
          v_count := v_count + 1;
        else
          raise;
        end if;
    end;
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
  'Atomically create/complete semester drops; NO_SPP falls back to leave+withdraw in the same transaction.';

revoke all on function public.create_immediate_semester_drops_batch(
  uuid, uuid[], text, numeric, numeric, uuid, text
) from public;
grant execute on function public.create_immediate_semester_drops_batch(
  uuid, uuid[], text, numeric, numeric, uuid, text
) to service_role;
