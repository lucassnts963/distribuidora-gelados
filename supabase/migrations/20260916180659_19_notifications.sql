-- estoque minimo por variacao (o que a organizacao decide sobre a
-- variacao, mesma tabela/chave de preco) e o carimbo de "ultima vez que
-- vi os avisos", pra badge de notificacao nao armazenada.
alter table org_variant_prices add column if not exists min_qty numeric;
alter table profiles add column if not exists notifications_seen_at timestamptz;

-- entra no grant restrito da Parte G, ao lado de full_name.
grant update (full_name, notifications_seen_at) on profiles to authenticated;
