import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Distribuidora · Controle",
  description: "Controle de estoque, vendas e caixa da distribuidora de gelados",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#f05d06",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-5">{children}</div>
        <Nav />
      </body>
    </html>
  );
}
