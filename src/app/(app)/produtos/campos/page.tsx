import { getSessionProfile } from "@/lib/auth";
import { listCustomFields } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { BackLink } from "@/components/BackLink";
import { toggleCustomFieldAction } from "../actions";
import { CustomFieldForm } from "./CustomFieldForm";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  boolean: "Sim/Não",
  select: "Lista",
};

export default async function CustomFieldsPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const fields = await listCustomFields(profile.org.id);

  return (
    <main>
      <BackLink href="/produtos" label="Produtos" />
      <h1 className="h1">Campos personalizados</h1>
      <p className="text-sm muted">
        Esses campos aparecem no cadastro de produto, além dos campos padrão (nome, SKU, descrição).
      </p>

      <Section title="Campos cadastrados">
        {!fields.length ? (
          <Empty>Nenhum campo personalizado ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((f) => (
              <li key={f.id} className="card flex items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-semibold">
                    {f.label} {f.required && <span className="text-xs text-red-600">*</span>}
                  </div>
                  <div className="text-xs muted">
                    {f.key} · {typeLabel[f.field_type]}
                    {f.options?.length ? ` · ${f.options.join(", ")}` : ""}
                  </div>
                </div>
                <form action={toggleCustomFieldAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="active" value={String(f.active)} />
                  <button className={f.active ? "btn-ghost" : "btn-primary"}>
                    {f.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Novo campo">
        <CustomFieldForm />
      </Section>
    </main>
  );
}
