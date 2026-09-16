"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createSaleAction } from "./actions";

type Variant = { id: string; name: string; products?: { name: string } | null; photoUrl?: string | null };
type Contact = { id: string; name: string };
type Price = { wholesale_cents: number | null; retail_cents: number | null };
type PaymentMethod = { id: string; name: string; fee_percent: number };
type CartLine = { qty: number; priceCents: number };

export function PDVForm({
  variants,
  contacts,
  prices,
  paymentMethods,
  loyaltyEnabled,
}: {
  variants: Variant[];
  contacts: Contact[];
  prices: Record<string, Price>;
  costs: Record<string, number>;
  paymentMethods: PaymentMethod[];
  loyaltyEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(createSaleAction, null);
  const [channel, setChannel] = useState<"retail" | "wholesale">("wholesale");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const priceMap = new Map(Object.entries(prices));

  const filtered = variants.filter((v) => {
    if (!query.trim()) return true;
    const haystack = `${v.products?.name ?? ""} ${v.name}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  function priceFor(variantId: string) {
    const p = priceMap.get(variantId);
    return channel === "wholesale" ? p?.wholesale_cents : p?.retail_cents;
  }

  function addToCart(variant: Variant) {
    const cents = priceFor(variant.id);
    if (!cents) return;
    setCart((prev) => {
      const cur = prev[variant.id];
      return { ...prev, [variant.id]: { qty: (cur?.qty ?? 0) + 1, priceCents: cur?.priceCents ?? cents } };
    });
  }

  function setQty(variantId: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[variantId];
        return next;
      }
      return { ...prev, [variantId]: { ...prev[variantId], qty } };
    });
  }

  useEffect(() => {
    if (state?.ok) setCart({});
  }, [state]);

  const cartEntries = Object.entries(cart);
  const total = useMemo(
    () => cartEntries.reduce((sum, [, line]) => sum + line.qty * line.priceCents, 0),
    [cartEntries]
  );
  const variantById = new Map(variants.map((v) => [v.id, v]));

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select name="contact_id" className="inp">
          <option value="">Venda avulsa (sem contato)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="channel"
          className="inp"
          value={channel}
          onChange={(e) => setChannel(e.target.value as "retail" | "wholesale")}
        >
          <option value="wholesale">Atacado</option>
          <option value="retail">Varejo</option>
        </select>
        {paymentMethods.length > 0 && (
          <select name="payment_method_id" className="inp">
            <option value="">Sem forma de pagamento</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
                {pm.fee_percent ? ` (${pm.fee_percent}%)` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <input
        className="inp"
        placeholder="Buscar produto…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!filtered.length ? (
        <p className="text-sm muted">Nenhuma variação encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((v) => {
            const cents = priceFor(v.id);
            const inCart = cart[v.id]?.qty ?? 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => addToCart(v)}
                disabled={!cents}
                className={`card relative overflow-hidden p-2 text-left ${
                  cents ? "hover:border-brand-400" : "cursor-not-allowed opacity-50"
                }`}
              >
                {inCart > 0 && (
                  <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
                    {inCart}
                  </span>
                )}
                {v.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photoUrl} alt="" className="mb-2 h-20 w-full rounded-md object-cover" />
                ) : (
                  <div className="mb-2 h-20 w-full rounded-md bg-stone-100" />
                )}
                <div className="text-xs font-semibold leading-tight">{v.name}</div>
                {v.products?.name && <div className="text-[11px] muted">{v.products.name}</div>}
                <div className="mt-1 text-xs font-bold text-brand-600">
                  {cents ? (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "sem preço"}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="card sticky bottom-16 space-y-2 p-3 lg:static">
        <div className="text-sm font-semibold">Carrinho</div>
        {loyaltyEnabled && (
          <input
            name="redeem_points"
            className="inp"
            inputMode="numeric"
            placeholder="Usar pontos de fidelidade (opcional)"
          />
        )}
        {!cartEntries.length ? (
          <p className="text-xs muted">Toque num produto pra adicionar.</p>
        ) : (
          <ul className="space-y-1">
            {cartEntries.map(([variantId, line]) => {
              const variant = variantById.get(variantId);
              return (
                <li key={variantId} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name="variant_id[]" value={variantId} />
                  <input type="hidden" name="qty[]" value={line.qty} />
                  <input type="hidden" name="unit_price[]" value={(line.priceCents / 100).toFixed(2)} />
                  <span className="flex-1 truncate">{variant?.name ?? "—"}</span>
                  <button
                    type="button"
                    className="btn-ghost h-7 w-7 shrink-0 p-0 text-base leading-none"
                    onClick={() => setQty(variantId, line.qty - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 shrink-0 text-center tabular">{line.qty}</span>
                  <button
                    type="button"
                    className="btn-ghost h-7 w-7 shrink-0 p-0 text-base leading-none"
                    onClick={() => setQty(variantId, line.qty + 1)}
                  >
                    +
                  </button>
                  <span className="w-20 shrink-0 text-right font-semibold tabular">
                    {((line.qty * line.priceCents) / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-sm font-bold">
          <span>Total</span>
          <span>{(total / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending || !cartEntries.length}>
          {pending ? "Registrando…" : "Finalizar venda"}
        </button>
      </div>
    </form>
  );
}
