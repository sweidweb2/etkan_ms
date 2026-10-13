-- Databases that already applied 20261011120000 still have authenticated
-- write policies. Drop them so only the service role can change gallery files.

drop policy if exists "Authenticated insert gallery images" on storage.objects;
drop policy if exists "Authenticated update gallery images" on storage.objects;
drop policy if exists "Authenticated delete gallery images" on storage.objects;
