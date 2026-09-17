-- Fotos de variacao + marca da organizacao, semente do catalogo publico
-- (vitrine, sem carrinho/checkout ainda).
alter table product_variants add column if not exists photo_url text;
alter table organizations add column if not exists logo_url text;
alter table organizations add column if not exists catalog_slug text unique;

-- Bucket publico pra leitura (o catalogo e' publico); escrita restrita por
-- policy de storage, caminho convencionado como {org_id}/{variant_id}/{arquivo}.
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy product_photos_write on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-photos'
  and (storage.foldername(name))[1] = my_org_id()::text
);

create policy product_photos_update on storage.objects for update
to authenticated
using (
  bucket_id = 'product-photos'
  and (storage.foldername(name))[1] = my_org_id()::text
);

create policy product_photos_delete on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-photos'
  and (storage.foldername(name))[1] = my_org_id()::text
);

-- Policies novas (aditivas — nao mexem nas existentes) liberando leitura
-- anonima so' das colunas de vitrine, so' pra organizacao com catalog_slug
-- definido e ativa.
create policy organizations_select_catalog on organizations for select
using (catalog_slug is not null and active);

create policy products_select_catalog on products for select
using (
  exists (
    select 1 from organizations o
    where o.id = products.owner_org_id and o.catalog_slug is not null and o.active
  )
);

create policy product_variants_select_catalog on product_variants for select
using (
  exists (
    select 1 from products p join organizations o on o.id = p.owner_org_id
    where p.id = product_variants.product_id and o.catalog_slug is not null and o.active
  )
);

create policy org_variant_prices_select_catalog on org_variant_prices for select
using (
  exists (
    select 1 from organizations o
    where o.id = org_variant_prices.org_id and o.catalog_slug is not null and o.active
  )
);
