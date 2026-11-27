-- Drop unused semester team permissions: list uses semesters.view; no delete flow.

delete from public.role_permissions
where permission_key in ('semesters.teams.view', 'semesters.teams.delete');

delete from public.permissions
where key in ('semesters.teams.view', 'semesters.teams.delete');
