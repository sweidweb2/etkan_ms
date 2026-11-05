-- Remove the equipment inventory and borrowing feature: tables and permissions.

drop table if exists public.borrow_equipment;
drop table if exists public.equipments;

-- Cascades to role_permissions and user_permissions.
delete from public.permissions where key like 'equipment.%';
