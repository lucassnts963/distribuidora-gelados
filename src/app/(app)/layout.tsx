import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/onboarding");

  return (
    <>
      {children}
      <Nav capabilities={profile.capabilities} />
    </>
  );
}
