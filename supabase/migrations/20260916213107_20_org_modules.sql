-- Liberacao de modulo por organizacao: base pra cobranca futura, e pro
-- papel vendedor nao precisar do modulo de producao. Sem linha = liberado
-- (grandfathering) — so listamos excecoes, nao o conjunto todo.
create table org_modules (
  org_id uuid not null references organizations(id) on delete cascade,
  module text not null check (module in (
    'produtos','insumos','producao','estoque','vendas','precos',
    'compras','contatos','despesas','relatorios','parcerias','pedidos'
  )),
  enabled boolean not null default true,
  primary key (org_id, module)
);
alter table org_modules enable row level security;
create policy org_modules_select on org_modules for select
using (
  org_id = my_org_id()
  or exists (select 1 from platform_admins where user_id = (select auth.uid()))
);
-- sem policy de insert/update/delete pro client normal: so' platform_admin
-- via service role em /admin, mesmo padrao de toggleOrgAccessAction.
