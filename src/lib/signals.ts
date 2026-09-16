import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/format";

export type Signal = {
  kind: "pedido" | "validade" | "estoque_baixo";
  title: string;
  detail: string;
  href: string;
  at: string; // ISO — comparado com profiles.notifications_seen_at pro badge
  severity: "info" | "warning" | "danger";
};

const VALIDITY_WINDOW_DAYS = 7;

/**
 * Sinais derivados, sem tabela própria de notificação — cada um já é uma
 * consulta sobre dado que existe (orders, inventory_lots, variant_costs).
 * Validade em especial não teria como "disparar" numa tabela de eventos:
 * ela não acontece, só passa a ser verdade com o tempo, e sem um cron
 * nada escreveria nada. Derivado nunca dessincroniza do dado real.
 */
export async function listSignals(orgId: string): Promise<Signal[]> {
  const supabase = await createClient();
  const signals: Signal[] = [];

  const [{ data: received }, { data: toConfirm }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, created_at, buyer:organizations!buyer_org_id(name), contact:contacts(name)")
      .eq("supplier_org_id", orgId)
      .eq("status", "requested"),
    supabase
      .from("orders")
      .select("id, decided_at, created_at, supplier:organizations!supplier_org_id(name)")
      .eq("buyer_org_id", orgId)
      .eq("status", "shipped"),
  ]);

  for (const o of received ?? []) {
    const buyer = o.buyer as unknown as { name: string } | null;
    const contact = o.contact as unknown as { name: string } | null;
    signals.push({
      kind: "pedido",
      title: "Pedido pra aceitar",
      detail: buyer?.name ?? contact?.name ?? "Pedido recebido",
      href: "/pedidos",
      at: o.created_at,
      severity: "info",
    });
  }
  for (const o of toConfirm ?? []) {
    const supplier = o.supplier as unknown as { name: string } | null;
    signals.push({
      kind: "pedido",
      title: "Confirmar recebimento",
      detail: supplier?.name ?? "Pedido despachado",
      href: "/pedidos",
      at: o.decided_at ?? o.created_at,
      severity: "info",
    });
  }

  const { data: lots } = await supabase
    .from("inventory_lots")
    .select("id, lot_number, expires_on, product_variants(name, products(name))")
    .eq("org_id", orgId)
    .gt("qty_remaining", 0)
    .not("expires_on", "is", null);
  for (const lot of lots ?? []) {
    if (!lot.expires_on) continue;
    const days = daysUntil(lot.expires_on);
    if (days > VALIDITY_WINDOW_DAYS) continue;
    const variant = lot.product_variants as unknown as { name: string; products: { name: string } } | null;
    signals.push({
      kind: "validade",
      title: days < 0 ? "Lote vencido" : "Vence logo",
      detail: `${variant?.products?.name ?? "—"} · ${variant?.name ?? "—"}${lot.lot_number ? " · lote " + lot.lot_number : ""}`,
      href: "/estoque",
      at: new Date(new Date(lot.expires_on).getTime() - VALIDITY_WINDOW_DAYS * 86400000).toISOString(),
      severity: days < 0 ? "danger" : "warning",
    });
  }

  const [{ data: costs }, { data: prices }] = await Promise.all([
    supabase.from("variant_costs").select("variant_id, qty, updated_at").eq("org_id", orgId),
    supabase
      .from("org_variant_prices")
      .select("variant_id, min_qty")
      .eq("org_id", orgId)
      .not("min_qty", "is", null),
  ]);
  const minByVariant = new Map((prices ?? []).map((p) => [p.variant_id as string, p.min_qty as number]));
  if (minByVariant.size) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, name, products(name)")
      .in("id", [...minByVariant.keys()]);
    const nameById = new Map(
      (variants ?? []).map((v) => [
        v.id as string,
        { name: v.name as string, product: (v.products as unknown as { name: string } | null)?.name ?? "—" },
      ])
    );
    for (const c of costs ?? []) {
      const min = minByVariant.get(c.variant_id);
      if (min == null || Number(c.qty) >= min) continue;
      const info = nameById.get(c.variant_id);
      signals.push({
        kind: "estoque_baixo",
        title: "Estoque baixo",
        detail: `${info?.product ?? "—"} · ${info?.name ?? "—"} — ${c.qty} (mínimo ${min})`,
        href: "/precos",
        at: c.updated_at,
        severity: "warning",
      });
    }
  }

  return signals.sort((a, b) => (a.at < b.at ? 1 : -1));
}
