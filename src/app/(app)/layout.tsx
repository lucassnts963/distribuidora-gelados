import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { listSignals } from "@/lib/signals";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/onboarding");

  if (!profile.org.active) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="h1">Acesso desativado</h1>
        <p className="muted max-w-sm text-sm">
          O acesso da organização "{profile.org.name}" está temporariamente desativado. Fale com o
          suporte para reativar.
        </p>
      </main>
    );
  }

  const signals = await listSignals(profile.org.id);
  const unseenCount = profile.notificationsSeenAt
    ? signals.filter((s) => s.at > profile.notificationsSeenAt!).length
    : signals.length;

  return (
    <>
      <Nav capabilities={profile.capabilities} unseenCount={unseenCount} />
      <div className="lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 lg:px-8 lg:pb-10">{children}</div>
      </div>
    </>
  );
}
