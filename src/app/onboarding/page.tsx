import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getSessionProfile();
  if (profile) redirect("/");

  return (
    <main className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-8 text-center">
        <h1 className="h1">Sua organização</h1>
        <p className="text-sm muted">
          Cadastre a empresa que você vai operar (fabricante, distribuidor, ou as duas coisas —
          isso não fica travado, dá pra ativar mais depois).
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
