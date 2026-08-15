-- Tighten the public projects image bucket to image MIME types and 5 MB.

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'projects';
