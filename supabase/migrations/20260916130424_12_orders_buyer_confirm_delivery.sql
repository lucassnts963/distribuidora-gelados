drop policy orders_update on orders;
create policy orders_update on orders for update
using (supplier_org_id = my_org_id() or buyer_org_id = my_org_id())
with check (
  supplier_org_id = my_org_id()
  or (buyer_org_id = my_org_id() and status in ('cancelled', 'delivered'))
);
