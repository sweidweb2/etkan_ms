-- Storage export now includes every object, not only images.

update public.permissions
set label = 'Export storage files'
where key = 'backup.export_storage';
