-- App settings (single-row) for feature flags like maintenance mode
create table if not exists app_settings (
  id int primary key default 1,
  maintenance_mode boolean not null default false,
  updated_at timestamp with time zone not null default now()
);

insert into app_settings (id, maintenance_mode)
values (1, false)
on conflict (id) do nothing;

alter table app_settings enable row level security;

-- Public read so middleware can check the flag in edge runtime.
create policy "app_settings_select_public"
on app_settings
for select
to public
using (true);

