import { TOGGLEABLE_MODULES } from "@/lib/modules";
import { toggleOrgModuleAction } from "./actions";

export function OrgModulesForm({ orgId, disabled }: { orgId: string; disabled: string[] }) {
  return (
    <div className="divide-y divide-stone-100">
      {TOGGLEABLE_MODULES.map((m) => {
        const isEnabled = !disabled.includes(m.key);
        return (
          <form
            key={m.key}
            action={toggleOrgModuleAction}
            className="flex items-center justify-between gap-2 py-2 text-sm"
          >
            <input type="hidden" name="org_id" value={orgId} />
            <input type="hidden" name="module" value={m.key} />
            <input type="hidden" name="enabled" value={String(!isEnabled)} />
            <span className="flex items-center gap-2">
              <m.icon className="h-4 w-4 text-stone-500" strokeWidth={2} />
              {m.label}
            </span>
            <button
              type="submit"
              className={`chip px-3 py-1 ${
                isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
              }`}
            >
              {isEnabled ? "Ligado" : "Desligado"}
            </button>
          </form>
        );
      })}
    </div>
  );
}
