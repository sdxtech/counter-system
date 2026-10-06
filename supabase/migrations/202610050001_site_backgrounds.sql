begin;

alter table public.sites add column if not exists background_path text;

-- Public delivery for dashboard images. Upload/update/delete use the guarded
-- server actions and service-role client; no client write policies are granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-backgrounds', 'site-backgrounds', true, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
commit;
