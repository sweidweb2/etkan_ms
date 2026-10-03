-- Live registration notifications: Realtime publication, RLS for browser
-- subscriptions, registration category, and suppress_live_toast flag.

alter table public.notifications
  drop constraint if exists notifications_category_check;

alter table public.notifications
  add constraint notifications_category_check
  check (
    category in (
      'system',
      'academic',
      'billing',
      'equipment',
      'attendance',
      'general',
      'registration'
    )
  );

alter table public.notifications
  add column if not exists suppress_live_toast boolean not null default false;

comment on column public.notifications.suppress_live_toast is
  'When true, persist for the inbox but do not show a live panel toast (e.g. staff-filled registration).';

alter table public.notifications enable row level security;

create policy notifications_select_manager_facing
on public.notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
  or (
    recipient_id is null
    and audience in ('manager', 'all')
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in (
          'manager',
          'co-manager',
          'ceo',
          'crm',
          'supervisor'
        )
    )
  )
  or (
    recipient_id is null
    and audience = (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
    )
  )
);

alter publication supabase_realtime add table public.notifications;
