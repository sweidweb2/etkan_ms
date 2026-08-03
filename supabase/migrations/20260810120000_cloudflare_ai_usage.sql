-- Cloudflare Workers AI usage log (schedule assistant and future features).
create table public.cloudflare_ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  user_label text not null default 'Unknown',
  feature text not null,
  model text not null,
  prompt text not null,
  response text,
  status text not null
    check (status in ('success', 'refused', 'error')),
  error_message text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  tool_rounds integer not null default 0,
  metadata jsonb
);

comment on table public.cloudflare_ai_usage is
  'Logged Cloudflare Workers AI requests with prompt and token usage.';

create index idx_cloudflare_ai_usage_created_at
  on public.cloudflare_ai_usage (created_at desc);

create index idx_cloudflare_ai_usage_feature
  on public.cloudflare_ai_usage (feature);

create index idx_cloudflare_ai_usage_user_id
  on public.cloudflare_ai_usage (user_id);
