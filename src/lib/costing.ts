import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

/**
 * Custo medio ponderado MOVEL (o metodo usado no Brasil), portado de
 * costing.ts do app original mas operando sobre o ledger unico
 * `inventory_movements` em vez de tabelas separadas de compra/venda/ajuste.
 *
 * Nao e' a media simples das entradas. A cada entrada o custo medio novo e':
 *
 *     (saldo_qty * custo_medio_atual + entrada_qty * custo_da_entrada)
 *     ------------------------------------------------------------------
 *                       saldo_qty + entrada_qty
 *
 * Toda saida (venda, perda, ajuste negativo) sai pelo custo medio vigente
 * NAQUELE momento, congelado no proprio movimento. `production`/`purchase`
 * usam o custo que veio no movimento (preco real pago/de producao);
 * `sale`/`loss`/`adjustment` sempre usam o custo medio calculado — qualquer
 * valor gravado neles antes do recalculo e' só um placeholder.
 *
 * As funcoes `*With` recebem o client Supabase por parametro (funcionam em
 * qualquer contexto: Server Action, RPC, ou um script standalone com
 * service role); as sem sufixo usam o client de request do Next.js.
 */

type Movement = {
  id: string;
  movement_type: "production" | "purchase" | "sale" | "adjustment" | "loss";
  qty: number;
  unit_cost_cents: number;
  occurred_on: string;
  created_at: string;
};

const TYPE_RANK: Record<Movement["movement_type"], number> = {
  production: 0,
  purchase: 0,
  adjustment: 1,
  sale: 2,
  loss: 2,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalcVariantCostWith(supabase: SupabaseClient<any>, orgId: string, variantId: string) {
  const { data } = await supabase
    .from("inventory_movements")
    .select("id, movement_type, qty, unit_cost_cents, occurred_on, created_at")
    .eq("org_id", orgId)
    .eq("variant_id", variantId);

  const movements = (data ?? []) as Movement[];
  movements.sort((a, b) => {
    if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return TYPE_RANK[a.movement_type] - TYPE_RANK[b.movement_type];
  });

  let qty = 0;
  let value = 0; // valor total do estoque em centavos
  let last = 0;
  const avg = () => (qty > 0 ? Math.round(value / qty) : last);

  const updates: { id: string; unit_cost_cents: number }[] = [];

  for (const m of movements) {
    if (m.movement_type === "production" || m.movement_type === "purchase") {
      qty += Number(m.qty);
      value += Number(m.qty) * m.unit_cost_cents;
      last = m.unit_cost_cents;
    } else {
      const unitCost = avg();
      updates.push({ id: m.id, unit_cost_cents: unitCost });
      qty += Number(m.qty); // ja vem com sinal (negativo em sale/loss, +/- em adjustment)
      value += Number(m.qty) * unitCost;
    }
    if (qty <= 0) {
      qty = Math.max(0, qty);
      value = qty === 0 ? 0 : value;
    }
    if (value < 0) value = 0;
  }

  await Promise.all(
    updates.map((u) =>
      supabase.from("inventory_movements").update({ unit_cost_cents: u.unit_cost_cents }).eq("id", u.id)
    )
  );

  await supabase.from("variant_costs").upsert(
    {
      org_id: orgId,
      variant_id: variantId,
      avg_cost_cents: avg(),
      qty,
      value_cents: Math.round(value),
      last_cost_cents: last,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,variant_id" }
  );

  return { avgCostCents: avg(), qty, valueCents: Math.round(value), lastCostCents: last };
}

export async function recalcVariantCost(orgId: string, variantId: string) {
  const supabase = await createClient();
  return recalcVariantCostWith(supabase, orgId, variantId);
}

/** Custo medio vigente de uma variacao (para prever lucro antes de registrar a venda). */
export async function currentAvgCost(orgId: string, variantId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("variant_costs")
    .select("avg_cost_cents")
    .eq("org_id", orgId)
    .eq("variant_id", variantId)
    .maybeSingle();
  return data?.avg_cost_cents ?? 0;
}

type RawMaterialMovement = {
  id: string;
  direction: "in" | "out";
  qty: number;
  unit_cost_cents: number;
  occurred_at: string;
};

/**
 * Mesma media movel ponderada de recalcVariantCostWith, mas sobre
 * raw_material_movements (entrada/saida de insumo em vez de
 * producao/venda de produto acabado). `in` entra pelo custo lancado;
 * `out` (inclusive consumo por producao) sai pelo custo medio vigente,
 * congelado no proprio movimento.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalcRawMaterialCostWith(supabase: SupabaseClient<any>, orgId: string, rawMaterialId: string) {
  const { data } = await supabase
    .from("raw_material_movements")
    .select("id, direction, qty, unit_cost_cents, occurred_at")
    .eq("raw_material_id", rawMaterialId);

  const movements = (data ?? []) as RawMaterialMovement[];
  movements.sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : 0));

  let qty = 0;
  let value = 0;
  let last = 0;
  const avg = () => (qty > 0 ? Math.round(value / qty) : last);

  const updates: { id: string; unit_cost_cents: number }[] = [];

  for (const m of movements) {
    if (m.direction === "in") {
      qty += Number(m.qty);
      value += Number(m.qty) * m.unit_cost_cents;
      last = m.unit_cost_cents;
    } else {
      const unitCost = avg();
      updates.push({ id: m.id, unit_cost_cents: unitCost });
      qty -= Number(m.qty);
      value -= Number(m.qty) * unitCost;
    }
    if (qty <= 0) {
      qty = Math.max(0, qty);
      value = 0;
    }
    if (value < 0) value = 0;
  }

  await Promise.all(
    updates.map((u) =>
      supabase.from("raw_material_movements").update({ unit_cost_cents: u.unit_cost_cents }).eq("id", u.id)
    )
  );

  await supabase.from("raw_material_costs").upsert(
    {
      org_id: orgId,
      raw_material_id: rawMaterialId,
      avg_cost_cents: avg(),
      qty,
      value_cents: Math.round(value),
      last_cost_cents: last,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,raw_material_id" }
  );

  return { avgCostCents: avg(), qty, valueCents: Math.round(value), lastCostCents: last };
}

export async function recalcRawMaterialCost(orgId: string, rawMaterialId: string) {
  const supabase = await createClient();
  return recalcRawMaterialCostWith(supabase, orgId, rawMaterialId);
}
