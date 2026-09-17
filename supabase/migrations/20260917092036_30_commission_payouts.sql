create table commission_payouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid not null references profiles(id),
  amount_cents integer not null,
  expense_id uuid references expenses(id),
  created_at timestamptz not null default now()
);
alter table commission_payouts enable row level security;
create policy commission_payouts_all on commission_payouts for all
  to authenticated using (org_id = my_org_id()) with check (org_id = my_org_id());
