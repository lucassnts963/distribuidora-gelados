create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','staff')),
  full_name text,
  created_at timestamptz not null default now()
);
create index profiles_org_id_idx on profiles(org_id);

create table partnerships (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references organizations(id) on delete cascade,
  buyer_org_id uuid not null references organizations(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint partnerships_not_self check (supplier_org_id <> buyer_org_id),
  constraint partnerships_unique_pair unique (supplier_org_id, buyer_org_id)
);
create index partnerships_supplier_idx on partnerships(supplier_org_id);
create index partnerships_buyer_idx on partnerships(buyer_org_id);

-- Helpers de RLS reutilizados por todas as tabelas multi-tenant.
create or replace function my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

create or replace function is_active_partner(p_supplier uuid, p_buyer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from partnerships
    where supplier_org_id = p_supplier
      and buyer_org_id = p_buyer
      and status = 'active'
  )
$$;

-- Visibilidade de catalogo ao longo da cadeia (fabricante -> distribuidor -> cliente -> ...),
-- sem limite fixo de elos; teto de seguranca de 20 saltos so pra nunca girar infinito
-- se alguem cadastrar uma parceria circular por engano.
create or replace function can_view_catalog(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive chain(org_id, depth) as (
    select target_org, 0
    union all
    select p.buyer_org_id, c.depth + 1
    from partnerships p
    join chain c on p.supplier_org_id = c.org_id
    where p.status = 'active' and c.depth < 20
  )
  select exists(select 1 from chain where org_id = my_org_id())
$$;

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table partnerships enable row level security;

create policy organizations_select on organizations for select
using (
  id = my_org_id()
  or exists (
    select 1 from partnerships
    where (supplier_org_id = organizations.id and buyer_org_id = my_org_id())
       or (buyer_org_id = organizations.id and supplier_org_id = my_org_id())
  )
);
create policy organizations_insert on organizations for insert
with check (auth.uid() is not null);
create policy organizations_update on organizations for update
using (id = my_org_id() and exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy profiles_select on profiles for select
using (id = auth.uid() or org_id = my_org_id());
create policy profiles_insert on profiles for insert
with check (id = auth.uid());
create policy profiles_update on profiles for update
using (id = auth.uid());

create policy partnerships_select on partnerships for select
using (supplier_org_id = my_org_id() or buyer_org_id = my_org_id());
create policy partnerships_insert on partnerships for insert
with check (
  (supplier_org_id = my_org_id() or buyer_org_id = my_org_id())
  and status = 'pending'
);
create policy partnerships_update on partnerships for update
using (supplier_org_id = my_org_id() or buyer_org_id = my_org_id())
with check (
  supplier_org_id = my_org_id()
  or (buyer_org_id = my_org_id() and status = 'revoked')
);

-- Resolve nome/id de uma organizacao pelo invite_code, sem expor listagem/enumeracao.
create or replace function lookup_org_by_invite_code(p_code text)
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name from organizations where invite_code = p_code
$$;

revoke all on function lookup_org_by_invite_code(text) from public;
grant execute on function lookup_org_by_invite_code(text) to authenticated;
