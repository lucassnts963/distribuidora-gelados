create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references organizations(id),
  variant_id uuid not null references product_variants(id) on delete cascade,
  raw_material_id uuid not null references raw_materials(id) on delete cascade,
  qty_per_unit numeric not null check (qty_per_unit > 0),
  created_at timestamptz not null default now(),
  unique (variant_id, raw_material_id)
);
alter table recipe_items enable row level security;
create policy recipe_items_all on recipe_items for all
using (owner_org_id = my_org_id()) with check (owner_org_id = my_org_id());

create table raw_material_costs (
  org_id uuid not null references organizations(id),
  raw_material_id uuid not null references raw_materials(id) on delete cascade,
  avg_cost_cents integer not null default 0,
  qty numeric not null default 0,
  value_cents integer not null default 0,
  last_cost_cents integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, raw_material_id)
);
alter table raw_material_costs enable row level security;
create policy raw_material_costs_select on raw_material_costs for select
using (org_id = my_org_id());

alter table raw_material_movements add column production_batch_id uuid
  references production_batches(id) on delete set null;
