-- Gift photos: an optional picture attached to a gift.
-- Stored in a PRIVATE bucket under "<sender uid>/<file>.jpg". Senders manage
-- their own folder; recipients only ever see a short-lived signed URL minted
-- by the get-gift-by-token function.

alter table public.gifts add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-photos', 'gift-photos', false, 8388608, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "gift photos: owner insert" on storage.objects;
create policy "gift photos: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gift-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gift photos: owner select" on storage.objects;
create policy "gift photos: owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'gift-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gift photos: owner delete" on storage.objects;
create policy "gift photos: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gift-photos' and (storage.foldername(name))[1] = auth.uid()::text);
