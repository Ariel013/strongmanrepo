import type { Metadata } from "next";
import "./globals.css";

/**
 * Aucune police distante n'est chargée : `next/font` télécharge les fichiers
 * au moment du build, et un build qui dépend du réseau échoue là où le réseau
 * est mauvais. Les polices système suffisent, et elles s'affichent
 * instantanément — ce qui compte sur un mur LED.
 */

export const metadata: Metadata = {
  title: "Arbitrage Strongman 2026 — FIBDA",
  description:
    "Gestion et arbitrage du Championnat National de Strongman 2026.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
