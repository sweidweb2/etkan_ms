-- When a drop-refund debit payment is deleted, reduce refunded_amount on the
-- drop request. If nothing remains refunded, clear owed so it does not reappear
-- in Need refund and no longer affects stats.

create or replace function public.sync_drop_refund_after_debit_delete(
  p_drop_request_id uuid,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.semester_drop_requests;
  v_amount numeric(10,2);
begin
  if p_drop_request_id is null then
    raise exception 'Drop request is required.';
  end if;

  v_amount := round(greatest(coalesce(p_amount, 0), 0)::numeric, 2);
  if v_amount <= 0 then
    raise exception 'Refund amount must be greater than 0.';
  end if;

  select * into v_req
  from public.semester_drop_requests
  where id = p_drop_request_id
  for update;

  if not found then
    raise exception 'Drop request not found.';
  end if;

  update public.semester_drop_requests
  set
    refunded_amount = greatest(coalesce(refunded_amount, 0) - v_amount, 0),
    refund_owed = case
      when greatest(coalesce(refunded_amount, 0) - v_amount, 0) = 0 then 0
      else refund_owed
    end,
    refund_status = case
      when greatest(coalesce(refunded_amount, 0) - v_amount, 0) = 0 then 'none'
      when greatest(coalesce(refund_owed, 0) - (greatest(coalesce(refunded_amount, 0) - v_amount, 0)), 0) > 0
        then 'owed'
      else 'processed'
    end,
    updated_at = now()
  where id = v_req.id
  returning * into v_req;

  return jsonb_build_object('request', to_jsonb(v_req));
end;
$$;

comment on function public.sync_drop_refund_after_debit_delete(uuid, numeric) is
  'After deleting a drop-refund debit: lower refunded_amount; clear owed when fully wiped.';

revoke all on function public.sync_drop_refund_after_debit_delete(uuid, numeric) from public;
grant execute on function public.sync_drop_refund_after_debit_delete(uuid, numeric) to service_role;
