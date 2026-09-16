import type { NextConfig } from "next";

/**
 * En-têtes de sécurité.
 *
 * Volontairement modestes : chacun de ceux qui suivent ferme une porte réelle
 * sans rien casser. Une politique de contenu stricte (`script-src` avec nonce)
 * demanderait de suivre chaque inline injecté par Next ; elle viendra quand
 * elle pourra être testée autrement qu'un jour de compétition.
 *
 * `frame-ancestors 'self'` remplace `X-Frame-Options` pour les navigateurs
 * modernes : les écrans publics n'ont aucune raison d'être encadrés par un
 * site tiers, qui pourrait alors superposer un faux classement au vrai.
 */
const ENTETES = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Les photos d'athlètes sont servies par Vercel Blob.
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
      "font-src 'self'",
      // Next injecte ses scripts et styles en ligne ; les autoriser ici sans
      // ouvrir les sources distantes, qui restent interdites.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      // Aucun greffon, aucune balise <base> réécrite, aucun formulaire
      // envoyé ailleurs que chez nous.
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:chemin*", headers: ENTETES }];
  },
};

export default nextConfig;
