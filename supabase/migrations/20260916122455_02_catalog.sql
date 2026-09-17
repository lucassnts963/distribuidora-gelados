create table products (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  sku text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_owner_idx on products(owner_org_id);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sku text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_variants_unique_name unique (product_id, name)
);
create index product_variants_product_idx on product_variants(product_id);

create table product_custom_fields (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text','number','date','boolean','select')),
  options jsonb,
  required boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_custom_fields_unique_key unique (owner_org_id, key)
);
create index product_custom_fields_owner_idx on product_custom_fields(owner_org_id);

create table product_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  field_id uuid not null references product_custom_fields(id) on delete cascade,
  value jsonb,
  constraint product_custom_field_values_unique unique (product_id, field_id)
);
create index product_custom_field_values_product_idx on product_custom_field_values(product_id);

alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_custom_fields enable row level security;
alter table product_custom_field_values enable row level security;

create policy products_select on products for select
using (can_view_catalog(owner_org_id));
create policy products_write on products for insert
with check (owner_org_id = my_org_id());
create policy products_update on products for update
using (owner_org_id = my_org_id());
create policy products_delete on products for delete
using (owner_org_id = my_org_id());

create policy product_variants_select on product_variants for select
using (exists (select 1 from products p where p.id = product_variants.product_id and can_view_catalog(p.owner_org_id)));
create policy product_variants_write on product_variants for insert
with check (exists (select 1 from products p where p.id = product_variants.product_id and p.owner_org_id = my_org_id()));
create policy product_variants_update on product_variants for update
using (exists (select 1 from products p where p.id = product_variants.product_id and p.owner_org_id = my_org_id()));
create policy product_variants_delete on product_variants for delete
using (exists (select 1 from products p where p.id = product_variants.product_id and p.owner_org_id = my_org_id()));

create policy product_custom_fields_select on product_custom_fields for select
using (can_view_catalog(owner_org_id));
create policy product_custom_fields_write on product_custom_fields for insert
with check (owner_org_id = my_org_id());
create policy product_custom_fields_update on product_custom_fields for update
using (owner_org_id = my_org_id());
create policy product_custom_fields_delete on product_custom_fields for delete
using (owner_org_id = my_org_id());

create policy product_custom_field_values_select on product_custom_field_values for select
using (exists (
  select 1 from products p where p.id = product_custom_field_values.product_id and can_view_catalog(p.owner_org_id)
));
create policy product_custom_field_values_write on product_custom_field_values for insert
with check (exists (select 1 from products p where p.id = product_custom_field_values.product_id and p.owner_org_id = my_org_id()));
create policy product_custom_field_values_update on product_custom_field_values for update
using (exists (select 1 from products p where p.id = product_custom_field_values.product_id and p.owner_org_id = my_org_id()));
create policy product_custom_field_values_delete on product_custom_field_values for delete
using (exists (select 1 from products p where p.id = product_custom_field_values.product_id and p.owner_org_id = my_org_id()));
