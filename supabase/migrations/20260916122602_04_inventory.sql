create table inventory_lots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  lot_number text,
  production_batch_id uuid references production_batches(id),
  source_lot_id uuid references inventory_lots(id),
  produced_on date,
  expires_on date,
  qty_received numeric not null,
  qty_remaining numeric not null,
  unit_cost_cents integer not null default 0,
  created_at timestamptz not null default now()
);
create index inventory_lots_org_variant_idx on inventory_lots(org_id, variant_id);

create table lot_stage_events (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references inventory_lots(id) on delete cascade,
  stage text not null check (stage in ('raw_material_reserved','in_production','finished_goods','in_transit','distributor_stock','sold')),
  entered_at timestamptz not null default now(),
  exited_at timestamptz
);
create index lot_stage_events_lot_idx on lot_stage_events(lot_id);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  lot_id uuid references inventory_lots(id),
  movement_type text not null check (movement_type in ('production','purchase','sale','adjustment','loss')),
  channel text check (channel in ('wholesale','retail')),
  qty numeric not null,
  unit_cost_cents integer not null default 0,
  occurred_on date not null default current_date,
  reference_type text check (reference_type in ('order','external_purchase','manual')),
  reference_id uuid,
  created_at timestamptz not null default now()
);
create index inventory_movements_org_variant_idx on inventory_movements(org_id, variant_id);

create table variant_costs (
  org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  avg_cost_cents integer not null default 0,
  qty numeric not null default 0,
  value_cents integer not null default 0,
  last_cost_cents integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, variant_id)
);

create table org_variant_prices (
  org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  wholesale_cents integer,
  retail_cents integer,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (org_id, variant_id)
);

alter table inventory_lots enable row level security;
alter table lot_stage_events enable row level security;
alter table inventory_movements enable row level security;
alter table variant_costs enable row level security;
alter table org_variant_prices enable row level security;

create policy inventory_lots_all on inventory_lots for all
using (org_id = my_org_id()) with check (org_id = my_org_id());

create policy lot_stage_events_all on lot_stage_events for all
using (exists (select 1 from inventory_lots l where l.id = lot_stage_events.lot_id and l.org_id = my_org_id()))
with check (exists (select 1 from inventory_lots l where l.id = lot_stage_events.lot_id and l.org_id = my_org_id()));

create policy inventory_movements_all on inventory_movements for all
using (org_id = my_org_id()) with check (org_id = my_org_id());

create policy variant_costs_all on variant_costs for all
using (org_id = my_org_id()) with check (org_id = my_org_id());

-- Preco por organizacao vendedora e visivel pra quem pode ver o catalogo da variacao
-- (precisa saber o preco de quem revende pra decidir de quem comprar), mas so o dono escreve.
create policy org_variant_prices_select on org_variant_prices for select
using (
  org_id = my_org_id()
  or exists (
    select 1 from product_variants v join products p on p.id = v.product_id
    where v.id = org_variant_prices.variant_id and can_view_catalog(p.owner_org_id)
  )
  or is_active_partner(org_id, my_org_id())
);
create policy org_variant_prices_write on org_variant_prices for insert
with check (org_id = my_org_id());
create policy org_variant_prices_update on org_variant_prices for update
using (org_id = my_org_id());
create policy org_variant_prices_delete on org_variant_prices for delete
using (org_id = my_org_id());

-- Disponibilidade (sem custo) exposta a parceiros ativos: funcao security definer,
-- nunca uma view direta sobre inventory_movements (que tem custo e e estritamente privada).
create or replace function available_stock(p_org_id uuid)
returns table(variant_id uuid, qty_available numeric, next_expiry date)
language sql
stable
security definer
set search_path = public
as $$
  select m.variant_id, sum(m.qty) as qty_available,
         min(l.expires_on) filter (where l.expires_on is not null) as next_expiry
  from inventory_movements m
  left join inventory_lots l on l.id = m.lot_id
  where m.org_id = p_org_id
    and (p_org_id = my_org_id() or is_active_partner(p_org_id, my_org_id()))
  group by m.variant_id
$$;

revoke all on function available_stock(uuid) from public;
grant execute on function available_stock(uuid) to authenticated;
