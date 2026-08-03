-- Wipe equipment inventory + borrow records only.
-- Order: child (borrow_equipment) first, then parent (equipments).
-- Does not touch profiles, users, or any other tables.

begin;

delete from public.borrow_equipment;
delete from public.equipments;

commit;
