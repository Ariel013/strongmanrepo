import type { Metadata } from "next";
import "./globals.css";

/**
 * Aucune police distante n'est chargée.
 *
 * Clash Display — la typographie du logiciel d'origine — est servie depuis
 * `public/polices`, en woff2, avec les polices système en repli. Un build ou
 * un jour J sans réseau doit afficher exactement la même chose : c'est tout
 * l'intérêt d'avoir extrait les fichiers du poste autonome plutôt que de les
 * appeler chez Google Fonts.
 */

export const metadata: Metadata = {
  title: "Arbitrage Strongman 2026 — FIBDA",
  description:
    "Gestion et arbitrage du Championnat National de Strongman 2026.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
