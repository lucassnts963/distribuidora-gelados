import { getSessionProfile } from "@/lib/auth";
import {
  listReceivedOrders,
  listPlacedOrders,
  listActiveSuppliers,
  supplierAvailableStock,
  listOrgPrices,
  listPaymentMethods,
} from "@/lib/queries";
import { Section, Empty, Money } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import {
  acceptOrderAction,
  startPickingAction,
  shipOrderAction,
  confirmReceiptAction,
  cancelOrderAction,
} from "./actions";
import { NewOrderForm } from "./NewOrderForm";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  requested: "Solicitado",
  accepted: "Aceito",
  picking: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export default async function PedidosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [received, placed, suppliers] = await Promise.all([
    listReceivedOrders(profile.org.id),
    listPlacedOrders(profile.org.id),
    listActiveSuppliers(profile.org.id),
  ]);

  const supplierOptions = await Promise.all(
    suppliers.map(async (s) => {
      const supplier = s.supplier as unknown as { id: string; name: string };
      const [stock, prices, paymentMethods] = await Promise.all([
        supplierAvailableStock(supplier.id),
        listOrgPrices(supplier.id),
        listPaymentMethods(supplier.id),
      ]);
      return {
        supplier,
        stock,
        prices: Object.fromEntries(prices),
        paymentMethods: paymentMethods.filter((pm) => pm.active),
      };
    })
  );

  return (
    <main>
      <h1 className="h1">Pedidos</h1>

      <Section title="Recebidos (você é o fornecedor)">
        {!received.length ? (
          <Empty>Nenhum pedido recebido ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {received.map((o) => {
              const buyer = o.buyer as unknown as { name: string } | null;
              const contact = o.contact as unknown as { name: string } | null;
              return (
                <li key={o.id} className="card space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{buyer?.name ?? contact?.name ?? "—"}</div>
                      <div className="text-xs muted">
                        {statusLabel[o.status]} · {o.channel === "wholesale" ? "Atacado" : "Varejo"}
                      </div>
                    </div>
                    <Money cents={o.total_cents} className="font-bold" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.status === "requested" && (
                      <>
                        <form action={acceptOrderAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton pendingText="Aceitando…">Aceitar</SubmitButton>
                        </form>
                        <form action={cancelOrderAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton className="btn-ghost" pendingText="Recusando…">
                            Recusar
                          </SubmitButton>
                        </form>
                      </>
                    )}
                    {o.status === "accepted" && (
                      <form action={startPickingAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <SubmitButton pendingText="Iniciando…">Iniciar separação</SubmitButton>
                      </form>
                    )}
                    {(o.status === "accepted" || o.status === "picking") && (
                      <form action={shipOrderAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <SubmitButton pendingText="Despachando…">
                          {buyer ? "Despachar" : "Marcar como entregue"}
                        </SubmitButton>
                      </form>
                    )}
                    {["requested", "accepted", "picking"].includes(o.status) && (
                      <form action={cancelOrderAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <SubmitButton className="btn-ghost" pendingText="Cancelando…">
                          Cancelar
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Feitos (você é o comprador)">
        {!placed.length ? (
          <Empty>Nenhum pedido feito ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {placed.map((o) => {
              const supplier = o.supplier as unknown as { name: string } | null;
              return (
                <li key={o.id} className="card space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{supplier?.name}</div>
                      <div className="text-xs muted">{statusLabel[o.status]}</div>
                    </div>
                    <Money cents={o.total_cents} className="font-bold" />
                  </div>
                  {o.status === "shipped" && (
                    <form action={confirmReceiptAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <SubmitButton className="btn-primary w-full" pendingText="Confirmando…">
                        Confirmar recebimento
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Novo pedido">
        {!supplierOptions.length ? (
          <Empty>Nenhum fornecedor parceiro ativo ainda — proponha uma parceria em Parcerias.</Empty>
        ) : (
          <NewOrderForm options={supplierOptions} />
        )}
      </Section>
    </main>
  );
}
