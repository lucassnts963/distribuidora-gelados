create table raw_materials (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  unit text not null default 'un',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index raw_materials_owner_idx on raw_materials(owner_org_id);

create table raw_material_movements (
  id uuid primary key default gen_random_uuid(),
  raw_material_id uuid not null references raw_materials(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  qty numeric not null,
  unit_cost_cents integer not null default 0,
  batch_number text,
  expires_on date,
  reason text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index raw_material_movements_material_idx on raw_material_movements(raw_material_id);

create table production_batches (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id),
  variant_id uuid references product_variants(id),
  batch_number text,
  planned_qty numeric,
  produced_qty numeric,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index production_batches_owner_idx on production_batches(owner_org_id);

create table production_capacity_plans (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid references product_variants(id),
  period_start date not null,
  period_end date not null,
  planned_qty numeric not null,
  notes text,
  created_at timestamptz not null default now()
);
create index production_capacity_plans_owner_idx on production_capacity_plans(owner_org_id);

alter table raw_materials enable row level security;
alter table raw_material_movements enable row level security;
alter table production_batches enable row level security;
alter table production_capacity_plans enable row level security;

create policy raw_materials_all on raw_materials for all
using (owner_org_id = my_org_id()) with check (owner_org_id = my_org_id());

create policy raw_material_movements_all on raw_material_movements for all
using (exists (select 1 from raw_materials r where r.id = raw_material_movements.raw_material_id and r.owner_org_id = my_org_id()))
with check (exists (select 1 from raw_materials r where r.id = raw_material_movements.raw_material_id and r.owner_org_id = my_org_id()));

create policy production_batches_all on production_batches for all
using (owner_org_id = my_org_id()) with check (owner_org_id = my_org_id());

create policy production_capacity_plans_all on production_capacity_plans for all
using (owner_org_id = my_org_id()) with check (owner_org_id = my_org_id());
