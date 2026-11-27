-- Waive remaining drop refund obligation (no debit payment).
-- Permission: accounting.drop_refunds.waive

insert into public.permissions (key, label, feature_group, access)
values
  (
    'accounting.drop_refunds.waive',
    'Waive / dismiss drop semester refund',
    'accounting',
    'write'
  )
on conflict (key) do update
set
  label = excluded.label,
  feature_group = excluded.feature_group,
  access = excluded.access;

insert into public.role_permissions (role, permission_key)
values
  ('manager', 'accounting.drop_refunds.waive')
on conflict (role, permission_key) do nothing;

create or replace function public.waive_semester_drop_refund(
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
  if p_request_id is null then
    raise exception 'Drop request is required.';
  end if;

  select * into v_req
  from public.semester_drop_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Drop request not found.';
  end if;

  if v_req.status is distinct from 'completed' then
    raise exception 'Only completed drop requests can have refunds waived.';
  end if;

  if v_req.refund_status is distinct from 'owed' then
    raise exception 'Only owed drop refunds can be waived.';
  end if;

  if coalesce(v_req.refund_owed, 0) <= coalesce(v_req.refunded_amount, 0) then
    raise exception 'There is no remaining refund to waive.';
  end if;

  -- Clear remaining obligation; keep any already-processed debit amount.
  update public.semester_drop_requests
  set
    refund_owed = coalesce(refunded_amount, 0),
    refund_status = case
      when coalesce(refunded_amount, 0) > 0 then 'processed'
      else 'none'
    end,
    updated_at = now()
  where id = v_req.id
  returning * into v_req;

  return jsonb_build_object('request', to_jsonb(v_req));
end;
$$;

comment on function public.waive_semester_drop_refund(uuid) is
  'Waive remaining drop refund owed without creating a debit payment. Drop stays completed.';

revoke all on function public.waive_semester_drop_refund(uuid) from public;
grant execute on function public.waive_semester_drop_refund(uuid) to service_role;
