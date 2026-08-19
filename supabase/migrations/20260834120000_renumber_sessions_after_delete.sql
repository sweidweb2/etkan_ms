-- Phase 37: compact session nb_order after delete in one RPC (no per-row REST updates).

create or replace function public.renumber_sessions_after_delete(p_class_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_class_id is null then
    return 0;
  end if;

  -- Offset avoids (class_id, nb_order) unique violations while renumbering.
  update public.sessions
  set nb_order = nb_order + 100000
  where class_id = p_class_id;

  with ordered as (
    select
      id,
      row_number() over (order by nb_order, created_at, id) as new_order
    from public.sessions
    where class_id = p_class_id
  )
  update public.sessions s
  set nb_order = o.new_order
  from ordered o
  where s.id = o.id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

comment on function public.renumber_sessions_after_delete(uuid) is
  'Renumber sessions for a class to 1..N after a delete. Single transaction; avoids per-row REST updates.';

revoke all on function public.renumber_sessions_after_delete(uuid) from public;
grant execute on function public.renumber_sessions_after_delete(uuid) to service_role;
