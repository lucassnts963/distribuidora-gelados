create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  kind text not null default 'varejo',
  note text,
  created_at timestamptz not null default now()
);
create index contacts_org_idx on contacts(org_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references organizations(id),
  buyer_org_id uuid references organizations(id),
  buyer_contact_id uuid references contacts(id),
  status text not null default 'requested' check (status in ('requested','accepted','picking','shipped','delivered','cancelled')),
  channel text check (channel in ('wholesale','retail')),
  note text,
  total_cents integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint orders_buyer_identified check (buyer_org_id is not null or buyer_contact_id is not null),
  constraint orders_not_self check (buyer_org_id is null or supplier_org_id <> buyer_org_id)
);
create index orders_supplier_idx on orders(supplier_org_id);
create index orders_buyer_org_idx on orders(buyer_org_id);
create index orders_buyer_contact_idx on orders(buyer_contact_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  qty numeric not null,
  unit_price_cents integer not null default 0
);
create index order_items_order_idx on order_items(order_id);

create table external_purchases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  supplier_name text,
  note text,
  occurred_on date not null default current_date,
  total_cents integer not null default 0,
  created_at timestamptz not null default now()
);
create index external_purchases_org_idx on external_purchases(org_id);

create table external_purchase_items (
  id uuid primary key default gen_random_uuid(),
  external_purchase_id uuid not null references external_purchases(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  qty numeric not null,
  unit_cost_cents integer not null default 0
);
create index external_purchase_items_purchase_idx on external_purchase_items(external_purchase_id);

alter table contacts enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table external_purchases enable row level security;
alter table external_purchase_items enable row level security;

create policy contacts_all on contacts for all
using (org_id = my_org_id()) with check (org_id = my_org_id());

create policy orders_select on orders for select
using (supplier_org_id = my_org_id() or buyer_org_id = my_org_id());
create policy orders_insert on orders for insert
with check (
  supplier_org_id = my_org_id()
  or (buyer_org_id = my_org_id() and is_active_partner(supplier_org_id, buyer_org_id))
);
create policy orders_update on orders for update
using (supplier_org_id = my_org_id() or buyer_org_id = my_org_id())
with check (
  supplier_org_id = my_org_id()
  or (buyer_org_id = my_org_id() and status = 'cancelled')
);

create policy order_items_select on order_items for select
using (exists (
  select 1 from orders o where o.id = order_items.order_id
    and (o.supplier_org_id = my_org_id() or o.buyer_org_id = my_org_id())
));
create policy order_items_insert on order_items for insert
with check (exists (
  select 1 from orders o where o.id = order_items.order_id
    and (o.supplier_org_id = my_org_id() or o.buyer_org_id = my_org_id())
));
create policy order_items_update on order_items for update
using (exists (
  select 1 from orders o where o.id = order_items.order_id
    and (o.supplier_org_id = my_org_id() or o.buyer_org_id = my_org_id())
));
create policy order_items_delete on order_items for delete
using (exists (
  select 1 from orders o where o.id = order_items.order_id
    and (o.supplier_org_id = my_org_id() or o.buyer_org_id = my_org_id())
));

create policy external_purchases_all on external_purchases for all
using (org_id = my_org_id()) with check (org_id = my_org_id());

create policy external_purchase_items_all on external_purchase_items for all
using (exists (select 1 from external_purchases e where e.id = external_purchase_items.external_purchase_id and e.org_id = my_org_id()))
with check (exists (select 1 from external_purchases e where e.id = external_purchase_items.external_purchase_id and e.org_id = my_org_id()));
