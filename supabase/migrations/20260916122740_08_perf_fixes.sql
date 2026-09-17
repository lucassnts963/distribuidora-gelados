-- Indices cobrindo FKs usadas em joins/RLS.
create index external_purchase_items_variant_idx on external_purchase_items(variant_id);
create index inventory_lots_production_batch_idx on inventory_lots(production_batch_id);
create index inventory_lots_source_lot_idx on inventory_lots(source_lot_id);
create index inventory_lots_variant_idx on inventory_lots(variant_id);
create index inventory_movements_lot_idx on inventory_movements(lot_id);
create index inventory_movements_variant_idx on inventory_movements(variant_id);
create index order_items_variant_idx on order_items(variant_id);
create index orders_created_by_idx on orders(created_by);
create index org_variant_prices_variant_idx on org_variant_prices(variant_id);
create index partnerships_requested_by_idx on partnerships(requested_by);
create index product_custom_field_values_field_idx on product_custom_field_values(field_id);
create index production_batches_product_idx on production_batches(product_id);
create index production_batches_variant_idx on production_batches(variant_id);
create index production_capacity_plans_variant_idx on production_capacity_plans(variant_id);
create index variant_costs_variant_idx on variant_costs(variant_id);

-- Evita reavaliar auth.uid() por linha nas policies que chamavam direto (sem passar por my_org_id()).
drop policy organizations_insert on organizations;
create policy organizations_insert on organizations for insert
with check ((select auth.uid()) is not null);

drop policy organizations_update on organizations;
create policy organizations_update on organizations for update
using (id = my_org_id() and exists (select 1 from profiles where id = (select auth.uid()) and role = 'admin'));

drop policy profiles_select on profiles;
create policy profiles_select on profiles for select
using (id = (select auth.uid()) or org_id = my_org_id());

drop policy profiles_insert on profiles;
create policy profiles_insert on profiles for insert
with check (id = (select auth.uid()));

drop policy profiles_update on profiles;
create policy profiles_update on profiles for update
using (id = (select auth.uid()));
