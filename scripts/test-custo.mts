/**
 * Testa o custo médio ponderado móvel (src/lib/costing.ts) direto contra o
 * Postgres, usando a service role (bypassa RLS só pra montar o cenário —
 * a lógica testada é a mesma que a aplicação usa em produção).
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no ambiente (não é a chave publishable
 * do .env.example). Rodar com: npx tsx scripts/test-custo.mts
 */
import { createClient } from "@supabase/supabase-js";
import { recalcVariantCostWith } from "../src/lib/costing";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

let failed = false;
function assertEqual(label: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} (esperado ${expected}, veio ${got})`);
  if (!ok) failed = true;
}

async function main() {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: "Teste custo " + Date.now() })
    .select("id")
    .single();
  if (orgError || !org) {
    console.error("Não deu pra criar a organização de teste:", orgError?.message);
    process.exit(1);
  }
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({ owner_org_id: org.id, name: "Produto teste" })
    .select("id")
    .single();
  if (productError || !product) {
    console.error("Não deu pra criar o produto de teste:", productError?.message);
    process.exit(1);
  }
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({ product_id: product.id, name: "Variação teste" })
    .select("id")
    .single();
  if (variantError || !variant) {
    console.error("Não deu pra criar a variação de teste:", variantError?.message);
    process.exit(1);
  }
  const orgId = org.id as string;
  const variantId = variant.id as string;

  const move = (row: Record<string, unknown>) =>
    supabase
      .from("inventory_movements")
      .insert({ org_id: orgId, variant_id: variantId, ...row })
      .select("id")
      .single();
  const recalc = () => recalcVariantCostWith(supabase, orgId, variantId);

  // 1) Custo médio após 1ª compra
  await move({ movement_type: "purchase", qty: 100, unit_cost_cents: 100, occurred_on: "2026-01-01" });
  let r = await recalc();
  assertEqual("custo médio após 1ª compra", r.avgCostCents, 100);

  // 2) Venda sai pelo custo da compra (única entrada até agora)
  const sale1 = await move({ movement_type: "sale", qty: -10, unit_cost_cents: 0, occurred_on: "2026-01-02" });
  await recalc();
  const { data: sale1After } = await supabase
    .from("inventory_movements")
    .select("unit_cost_cents")
    .eq("id", sale1.data!.id)
    .single();
  assertEqual("custo da venda = custo da compra", sale1After!.unit_cost_cents, 100);

  // 3) Custo médio móvel (NÃO simples) após 2ª compra a preço diferente
  //    saldo 90 a R$1,00 + compra 100 a R$2,00 -> média real R$1,91 (não R$1,50)
  await move({ movement_type: "purchase", qty: 100, unit_cost_cents: 200, occurred_on: "2026-01-03" });
  r = await recalc();
  assertEqual("custo médio móvel após 2ª compra (não é média simples)", r.avgCostCents, 191);

  // 4) Congelamento: a venda antiga não muda com uma compra que não é retroativa
  const { data: sale1Frozen } = await supabase
    .from("inventory_movements")
    .select("unit_cost_cents")
    .eq("id", sale1.data!.id)
    .single();
  assertEqual("venda antiga continua congelada", sale1Frozen!.unit_cost_cents, 100);

  // 5) 3ª compra a preço mais baixo derruba a média
  //    saldo 190 a ~190,53 (21000/110) + compra 100 a R$0,50 -> nova média mais baixa
  await move({ movement_type: "purchase", qty: 100, unit_cost_cents: 50, occurred_on: "2026-01-04" });
  r = await recalc();
  if (r.avgCostCents >= 191) {
    console.log(`FAIL 3ª compra mais barata deveria baixar a média (ficou ${r.avgCostCents})`);
    failed = true;
  } else {
    console.log(`PASS 3ª compra mais barata baixou a média (${r.avgCostCents})`);
  }

  // 6) Perda sai pelo custo médio vigente
  const loss = await move({ movement_type: "loss", qty: -5, unit_cost_cents: 0, occurred_on: "2026-01-05" });
  const beforeLossAvg = r.avgCostCents;
  r = await recalc();
  const { data: lossAfter } = await supabase
    .from("inventory_movements")
    .select("unit_cost_cents")
    .eq("id", loss.data!.id)
    .single();
  assertEqual("perda sai pelo custo médio vigente", lossAfter!.unit_cost_cents, beforeLossAvg);

  // 7) Compra retroativa reprocessa cronologicamente e recalcula vendas posteriores
  //    Insere uma compra com data ANTES da venda 1 (2026-01-02) -> a venda 1 deve
  //    deixar de custar 100 (não existe mais só uma entrada de 100 antes dela).
  await move({ movement_type: "purchase", qty: 50, unit_cost_cents: 300, occurred_on: "2025-12-31" });
  await recalc();
  const { data: sale1Retro } = await supabase
    .from("inventory_movements")
    .select("unit_cost_cents")
    .eq("id", sale1.data!.id)
    .single();
  if (sale1Retro!.unit_cost_cents === 100) {
    console.log("FAIL compra retroativa deveria ter mudado o custo da venda antiga");
    failed = true;
  } else {
    console.log(`PASS compra retroativa recalculou a venda antiga (agora ${sale1Retro!.unit_cost_cents})`);
  }

  // limpeza
  await supabase.from("organizations").delete().eq("id", orgId);

  process.exit(failed ? 1 : 0);
}

main();
