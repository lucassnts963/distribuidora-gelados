import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { listRawMaterials, rawMaterialBalance } from "@/lib/queries";
import { Section, Empty } from "@/components/ui";
import { NewRawMaterialForm } from "./NewRawMaterialForm";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const materials = await listRawMaterials(profile.org.id);
  const balances = await Promise.all(materials.map((m) => rawMaterialBalance(m.id)));

  return (
    <main>
      <h1 className="h1">Insumos</h1>

      <Section title="Cadastrados">
        {!materials.length ? (
          <Empty>Nenhum insumo ainda.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((m, i) => (
              <li key={m.id}>
                <Link href={`/insumos/${m.id}`} className="card flex items-center justify-between p-3">
                  <div className="font-semibold">{m.name}</div>
                  <div className="tabular text-sm muted">
                    {balances[i]} {m.unit}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Novo insumo">
        <NewRawMaterialForm />
      </Section>
    </main>
  );
}
