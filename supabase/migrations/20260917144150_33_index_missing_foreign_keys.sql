-- FKs sem indice de cobertura nas tabelas criadas das Partes M a AC. A
-- migration 08_perf_fixes cobriu as tabelas das Fases 1-2 e nada foi
-- revisado depois; apontado pelo advisor de performance do Supabase.
create index if not exists commission_payouts_expense_idx on commission_payouts(expense_id);
create index if not exists commission_payouts_org_idx on commission_payouts(org_id);
create index if not exists commission_payouts_vendor_idx on commission_payouts(vendor_id);
create index if not exists loyalty_ledger_contact_idx on loyalty_ledger(contact_id);
create index if not exists loyalty_ledger_order_idx on loyalty_ledger(order_id);
create index if not exists loyalty_ledger_org_idx on loyalty_ledger(org_id);
create index if not exists orders_payment_method_idx on orders(payment_method_id);
create index if not exists payment_methods_org_idx on payment_methods(org_id);
create index if not exists raw_material_costs_raw_material_idx on raw_material_costs(raw_material_id);
create index if not exists raw_material_movements_production_batch_idx on raw_material_movements(production_batch_id);
create index if not exists recipe_items_owner_org_idx on recipe_items(owner_org_id);
create index if not exists recipe_items_raw_material_idx on recipe_items(raw_material_id);
