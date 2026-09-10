import { redirect } from "next/navigation";
import { isLogged } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLogged())) redirect("/login");
  return <>{children}</>;
}
