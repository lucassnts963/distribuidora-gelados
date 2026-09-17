alter table organizations add column if not exists active boolean not null default true;
alter table organizations add column if not exists plan text not null default 'free'
  check (plan in ('free'));

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;

drop policy if exists platform_admins_select_self on platform_admins;
create policy platform_admins_select_self on platform_admins for select
using (user_id = (select auth.uid()));

drop policy if exists organizations_select on organizations;
create policy organizations_select on organizations for select
using (
  id = my_org_id()
  or exists (
    select 1 from partnerships
    where (supplier_org_id = organizations.id and buyer_org_id = my_org_id())
       or (buyer_org_id = organizations.id and supplier_org_id = my_org_id())
  )
  or exists (select 1 from platform_admins where user_id = (select auth.uid()))
);

drop policy if exists organizations_update on organizations;
create policy organizations_update on organizations for update
using (
  (id = my_org_id() and exists (select 1 from profiles where id = (select auth.uid()) and role = 'admin'))
  or exists (select 1 from platform_admins where user_id = (select auth.uid()))
);
