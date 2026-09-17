/**
 * L'empreinte de fraîcheur des écrans publics.
 *
 * Les murs LED interrogent cette route toutes les deux secondes et ne
 * redemandent leur page que si l'empreinte a changé. C'est ce qui évite de
 * recalculer les classements trente fois par minute et par écran, pour un
 * affichage qui, entre deux passages, ne bouge pas.
 *
 * Volontairement publique, comme `/ecran/*` : un mur LED n'a pas de session, et
 * la réponse ne contient qu'une chaîne opaque — aucun nom, aucune performance,
 * aucune donnée personnelle.
 */

import { signatureEcrans } from "@/lib/donnees";

export const dynamic = "force-dynamic";

/** La chaîne brute porte des identifiants internes et le motif de suspension : on n'en sort que l'empreinte. */
async function hacher(texte: string): Promise<string> {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  try {
    return Response.json(
      { signature: await hacher(await signatureEcrans()) },
      {
        // Jamais de cache : une empreinte mise en cache ferait exactement ce
        // qu'elle est censée empêcher — un écran figé qui se croit à jour.
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    // Base injoignable : on rend une empreinte vide plutôt qu'une erreur. Le
    // client la traite comme « inconnue » et retombe sur son rafraîchissement
    // périodique, qui est justement le filet prévu pour ce cas.
    return Response.json(
      { signature: "" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
