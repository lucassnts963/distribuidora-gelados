create table loyalty_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  enabled boolean not null default false,
  points_per_100_wholesale numeric not null default 0,
  points_per_100_retail numeric not null default 0,
  redeem_cents_per_point numeric not null default 0
);
alter table loyalty_settings enable row level security;
create policy loyalty_settings_all on loyalty_settings for all
  to authenticated using (org_id = my_org_id()) with check (org_id = my_org_id());

create table loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  order_id uuid references orders(id),
  points numeric not null,
  created_at timestamptz not null default now()
);
alter table loyalty_ledger enable row level security;
create policy loyalty_ledger_select on loyalty_ledger for select
  to authenticated using (org_id = my_org_id());
create policy loyalty_ledger_insert on loyalty_ledger for insert
  to authenticated with check (org_id = my_org_id());
