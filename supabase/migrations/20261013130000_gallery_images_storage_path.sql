-- Gallery rows store the object path. The public URL is built when rendering.

alter table public.gallery_images
  add column storage_path text;

update public.gallery_images
set storage_path =
  'gallery/' || substring(direct_url from '/storage/v1/object/public/gallery/([^?#]+)')
where direct_url ~ '/storage/v1/object/public/gallery/';

-- Drive and other external URLs cannot render without the old thumbnail fallback.
delete from public.gallery_images
where storage_path is null
   or storage_path = 'gallery/';

alter table public.gallery_images
  alter column storage_path set not null;

alter table public.gallery_images
  drop constraint if exists gallery_images_direct_url_unique;

alter table public.gallery_images
  drop column direct_url;

create unique index gallery_images_storage_path_unique
  on public.gallery_images (storage_path);

comment on table public.gallery_images is
  'Images shown on the public gallery page (display name + Storage object path).';

comment on column public.gallery_images.storage_path is
  'Object path in the public gallery bucket, including the gallery/ prefix.';
