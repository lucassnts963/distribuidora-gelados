import { saveCustomValuesAction } from "../actions";
import type { CustomField } from "@/lib/queries";

export function CustomValuesForm({
  productId,
  fields,
  values,
}: {
  productId: string;
  fields: CustomField[];
  values: { field_id: string; value: unknown }[];
}) {
  const valueById = new Map(values.map((v) => [v.field_id, v.value]));

  return (
    <form action={saveCustomValuesAction} className="card space-y-4 p-4">
      <input type="hidden" name="product_id" value={productId} />
      {fields.map((f) => {
        const current = valueById.get(f.id);
        return (
          <div key={f.id}>
            <input type="hidden" name="field_id" value={f.id} />
            <label className="lbl">
              {f.label} {f.required && <span className="text-red-600">*</span>}
            </label>
            {f.field_type === "boolean" ? (
              <input
                type="checkbox"
                name={`value_${f.id}`}
                className="h-4 w-4"
                defaultChecked={current === true}
              />
            ) : f.field_type === "select" ? (
              <select name={`value_${f.id}`} className="inp" defaultValue={(current as string) ?? ""}>
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"}
                name={`value_${f.id}`}
                className="inp"
                defaultValue={(current as string | number) ?? ""}
                required={f.required}
              />
            )}
          </div>
        );
      })}
      <button className="btn-primary w-full">Salvar campos</button>
    </form>
  );
}
