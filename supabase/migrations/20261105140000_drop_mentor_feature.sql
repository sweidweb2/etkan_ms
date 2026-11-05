-- Remove the mentor feature: catalog, capability matrix, RPCs, profile flag, permissions.

drop function if exists public.clear_mentor_related_data(uuid);
drop function if exists public.delete_mentor_subject_capability_pairs(text[], text[]);
drop function if exists public.reorder_mentor_subjects(text[]);

drop table if exists public.mentor_subject_capability;
drop table if exists public.mentor_subjects;

alter table public.profiles drop column if exists is_mentor;

-- Cascades to role_permissions and user_permissions.
delete from public.permissions where key like 'mentors.%';
