-- Business logos. Public-read (they appear on invoices clients open without an
-- account) but each user can only write inside a folder named after their own id.
-- PNG only, 512 KB max: the browser resizes and re-encodes before upload, and
-- PNG works in both the web preview and the PDF renderer.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 524288, array['image/png'])
on conflict (id) do nothing;

create policy "logos: owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
