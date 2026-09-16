import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/onboarding");

  if (!profile.org.active) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="h1">Acesso desativado</h1>
        <p className="muted max-w-sm text-sm">
          O acesso da organização "{profile.org.name}" está temporariamente desativado. Fale com o
          suporte para reativar.
        </p>
      </main>
    );
  }

  return (
    <>
      {children}
      <Nav capabilities={profile.capabilities} />
    </>
  );
}
