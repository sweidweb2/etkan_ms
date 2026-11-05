-- Remove the AI feature: Workers AI usage log and its view permission.

drop table if exists public.cloudflare_ai_usage;

-- Cascades to role_permissions and user_permissions.
delete from public.permissions where key = 'cloudflare_ai_usage.view';
