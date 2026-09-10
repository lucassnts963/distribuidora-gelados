export type Product = {
  id: number; name: string; cost_cents: number;
  wholesale_cents: number; retail_cents: number; active: number; created_at: string;
};
export type Flavor = {
  id: number; product_id: number; name: string;
  cost_cents: number | null; wholesale_cents: number | null; retail_cents: number | null;
  active: number;
};
export type StockRow = {
  flavor_id: number; product_id: number; product_name: string; flavor_name: string;
  cost_cents: number; listed_cost_cents: number; avg_cost_cents: number; last_cost_cents: number;
  wholesale_cents: number; retail_cents: number; flavor_active: number;
  qty: number; last_sale_on: string | null; last_purchase_on: string | null;
};
export type Customer = { id: number; name: string; phone: string | null; kind: string; note: string | null };
export type Channel = "atacado" | "varejo";
