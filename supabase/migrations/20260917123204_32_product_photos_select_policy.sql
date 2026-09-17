-- O storage-api sobe arquivo com:
--   INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE ... RETURNING *
-- Tanto o ON CONFLICT DO UPDATE quanto o RETURNING fazem o Postgres exigir
-- policy de SELECT na tabela. So existiam INSERT/UPDATE/DELETE, entao todo
-- upload falhava com "new row violates row-level security policy", mesmo com
-- JWT valido e path correto.
create policy product_photos_read on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = (my_org_id())::text
  );
