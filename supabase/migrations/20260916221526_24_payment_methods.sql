create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  fee_percent numeric not null default 0,
  active boolean not null default true
);
alter table payment_methods enable row level security;
create policy payment_methods_all on payment_methods for all
  to authenticated
  using (org_id = my_org_id())
  with check (org_id = my_org_id());

alter table orders add constraint orders_payment_method_id_fkey
  foreign key (payment_method_id) references payment_methods(id);
alter table orders add column if not exists fee_cents integer;
