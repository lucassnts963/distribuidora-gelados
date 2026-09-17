alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin','staff','vendedor'));

-- basis points (250 = 2,5%). So' gravavel por service role (nao entra no
-- grant restrito da Parte G) -- mesmo motivo de role/org_id: e' algo que
-- so' o admin da organizacao decide sobre outra pessoa, nunca a propria.
alter table profiles add column if not exists commission_rate_bp integer;

-- congelado na hora da venda, mesmo principio ja usado em custo/preco:
-- nunca recalcular comissao de venda antiga se a taxa do vendedor mudar
-- depois. payment_method_id fica sem FK por enquanto -- a tabela
-- payment_methods ainda nao existe, entra na Parte P.
alter table orders add column if not exists commission_cents integer;
alter table orders add column if not exists payment_method_id uuid;
