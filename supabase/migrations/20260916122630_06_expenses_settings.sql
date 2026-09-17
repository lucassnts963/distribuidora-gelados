create table expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  category text not null,
  description text,
  occurred_on date not null default current_date,
  amount_cents integer not null default 0,
  created_at timestamptz not null default now()
);
create index expenses_org_idx on expenses(org_id);

create table org_settings (
  org_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  value text,
  primary key (org_id, key)
);

alter table expenses enable row level security;
alter table org_settings enable row level security;

create policy expenses_all on expenses for all
using (org_id = my_org_id()) with check (org_id = my_org_id());

create policy org_settings_all on org_settings for all
using (org_id = my_org_id()) with check (org_id = my_org_id());
