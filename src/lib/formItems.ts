import { toCents } from "@/lib/format";

/** Lê linhas de itens (arrays paralelos) de um FormData: variant_id[], qty[], <priceKey>[]. */
export function parseItems(form: FormData, priceKey: string) {
  const variantIds = form.getAll("variant_id[]") as string[];
  const qtys = form.getAll("qty[]") as string[];
  const prices = form.getAll(`${priceKey}[]`) as string[];
  const items: { variantId: string; qty: number; cents: number }[] = [];
  for (let i = 0; i < variantIds.length; i++) {
    const qty = Number(String(qtys[i] ?? "").replace(",", "."));
    if (!variantIds[i] || !qty) continue;
    items.push({ variantId: variantIds[i], qty, cents: toCents(prices[i]) });
  }
  return items;
}
