import type { MetadataRoute } from "next";

/**
 * Le manifeste de l'application installée sur téléphone.
 *
 * Il manquait : ajoutée à l'écran d'accueil, l'application s'ouvrait dans un
 * navigateur ordinaire, barre d'adresse comprise. Sur un téléphone tenu d'une
 * main au bord du plateau, ces 80 pixels de chrome sont autant de liste des
 * engagés en moins.
 *
 * `start_url` pointe sur `/admin` : celui qui installe l'application sur son
 * téléphone est un officiel, pas le public. Les écrans du mur LED s'ouvrent
 * en plein écran depuis la régie, pas depuis une icône.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arbitrage Strongman 2026 — FIBDA",
    short_name: "Strongman 2026",
    description:
      "Gestion et arbitrage du Championnat National de Strongman 2026.",
    lang: "fr",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FCFAF6",
    // La couleur du bandeau : la barre d'état du téléphone la prolonge.
    theme_color: "#03562A",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android rogne un cercle dans celle-ci : elle a sa propre marge.
      {
        src: "/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
