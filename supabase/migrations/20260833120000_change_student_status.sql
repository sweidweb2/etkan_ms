-- Phase 18: change student status + optional class removal / open-SPP delete
-- in one transaction. Reuses sync_student_left_class and
-- internal_recalc_payment_phase_status_from_spps.

create or replace function public.change_student_status(
  p_user_id uuid,
  p_target_status text,
  p_remove_from_classes boolean,
  p_remove_open_spps boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.student_profiles;
  v_previous text;
  v_removed jsonb := '[]'::jsonb;
  v_retained jsonb := '[]'::jsonb;
  v_deleted_spps jsonb := '[]'::jsonb;
  v_eligible_count integer := 0;
  v_open_spp_count integer := 0;
  v_paid_open_spp_count integer := 0;
  v_class_id uuid;
  v_leave jsonb;
  v_phase_id uuid;
begin
  if p_target_status is distinct from 'active'
     and p_target_status is distinct from 'inactive' then
    raise exception 'Select activate or inactivate.';
  end if;

  select * into v_profile
  from public.student_profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'Student profile not found.';
  end if;

  v_previous := coalesce(v_profile.status, 'active');

  if p_target_status = 'active' then
    update public.student_profiles
    set status = 'active'
    where id = v_profile.id
    returning * into v_profile;

    if not found then
      raise exception 'Unable to activate student.';
    end if;

    return jsonb_build_object(
      'profileId', v_profile.id,
      'previousStatus', v_previous,
      'status', v_profile.status,
      'removedClasses', '[]'::jsonb,
      'retainedSpps', '[]'::jsonb,
      'deletedSpps', '[]'::jsonb
    );
  end if;

  if coalesce(p_remove_from_classes, false) then
    select count(*)
    into v_eligible_count
    from public.student_class sc
    join public.classes c on c.id = sc.class_id
    where sc.user_id = p_user_id
      and c.status in ('scheduled', 'in_progress', 'paused');

    if v_eligible_count = 0 then
      raise exception 'This student has no scheduled, in-progress, or paused class memberships to remove.';
    end if;
  end if;

  if coalesce(p_remove_open_spps, false) then
    select
      count(*),
      count(*) filter (
        where exists (
          select 1
          from public.student_payments sp
          where sp.student_payment_phase_id = spp.id
        )
      )
    into v_open_spp_count, v_paid_open_spp_count
    from public.student_payment_phases spp
    join public.payment_phases pp on pp.id = spp.payment_phase_id
    where spp.student_id = p_user_id
      and pp.status = 'opened';

    if v_open_spp_count = 0 then
      raise exception 'This student has no SPPs on an opened payment phase to delete.';
    end if;

    if v_paid_open_spp_count > 0 then
      raise exception 'One or more open SPPs have payments. Delete payments from Accounting first.';
    end if;
  end if;

  if coalesce(p_remove_from_classes, false) then
    with deleted as (
      delete from public.student_class sc
      using public.classes c
      where sc.class_id = c.id
        and sc.user_id = p_user_id
        and c.status in ('scheduled', 'in_progress', 'paused')
      returning
        sc.id as student_class_id,
        sc.class_id,
        coalesce(c.name, 'Untitled class') as class_name
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'studentClassId', deleted.student_class_id,
          'classId', deleted.class_id,
          'className', deleted.class_name
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
      v_leave := public.sync_student_left_class(p_user_id, v_class_id);
      if coalesce((v_leave->>'retained')::boolean, false)
         and v_leave->'spp' is not null
         and jsonb_typeof(v_leave->'spp') = 'object' then
        v_retained := v_retained || jsonb_build_array(
          jsonb_build_object(
            'classId', v_class_id,
            'semesterId', v_leave->'phase'->>'semester_id',
            'spp', v_leave->'spp'
          )
        );
      end if;
    end loop;
  end if;

  if coalesce(p_remove_open_spps, false) then
    with deleted as (
      delete from public.student_payment_phases spp
      using public.payment_phases pp
      where spp.payment_phase_id = pp.id
        and spp.student_id = p_user_id
        and pp.status = 'opened'
      returning
        spp.id,
        spp.student_id,
        spp.payment_phase_id,
        spp.status,
        pp.name as payment_phase_name
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'sppId', deleted.id,
          'paymentPhaseId', deleted.payment_phase_id,
          'paymentPhaseName', deleted.payment_phase_name,
          'sppStatus', deleted.status
        )
      ),
      '[]'::jsonb
    )
    into v_deleted_spps
    from deleted;

    for v_phase_id in
      select distinct (item->>'paymentPhaseId')::uuid
      from jsonb_array_elements(v_deleted_spps) as item
    loop
      perform public.internal_recalc_payment_phase_status_from_spps(v_phase_id);
    end loop;
  end if;

  update public.student_profiles
  set status = 'inactive'
  where id = v_profile.id
  returning * into v_profile;

  if not found then
    raise exception 'Unable to inactivate student.';
  end if;

  return jsonb_build_object(
    'profileId', v_profile.id,
    'previousStatus', v_previous,
    'status', v_profile.status,
    'removedClasses', v_removed,
    'retainedSpps', v_retained,
    'deletedSpps', v_deleted_spps
  );
end;
$$;

comment on function public.change_student_status(uuid, text, boolean, boolean) is
  'Activate or inactivate a student. Optional set-based class removal (leave-sync) and payment-free open-SPP delete + phase recalc, then status update.';

revoke all on function public.change_student_status(uuid, text, boolean, boolean) from public;
grant execute on function public.change_student_status(uuid, text, boolean, boolean) to service_role;
