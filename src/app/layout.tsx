import type { Metadata, Viewport } from "next";
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
  // iOS ne lit pas le manifeste pour l'icône d'accueil : il lui faut celle-ci.
  appleWebApp: {
    capable: true,
    title: "Strongman 2026",
    // `default`, et non `black-translucent` : ce dernier fait passer la page
    // SOUS la barre d'état, où l'heure du téléphone se serait superposée au
    // bandeau vert. La barre garde donc sa place, et la page commence dessous.
    statusBarStyle: "default",
  },
  icons: { apple: "/apple-touch-icon.png" },
};

/**
 * `viewport-fit=cover` sert ici au bas de l'écran et au mode paysage : sans
 * lui, la barre gestuelle et l'encoche laissent des bandes mortes.
 * `themeColor` teinte la barre d'état de la couleur du bandeau.
 *
 * Le zoom manuel reste **autorisé** : le bloquer met dehors quiconque a besoin
 * d'agrandir, et une table de marque travaille parfois à bout de bras.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03562A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
