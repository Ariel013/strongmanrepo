/**
 * Garde d'accès à l'administration.
 *
 * Ce middleware est la PREMIÈRE barrière, pas la seule. Il empêche d'afficher
 * les pages `/admin`, mais chaque écriture revérifie la session de son côté :
 * un garde unique qu'on contourne (route oubliée, appel direct à une API)
 * laisserait tout ouvert. Deux barrières indépendantes, jamais une.
 */

import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE, lireSession } from "@/lib/auth";

export async function middleware(requete: NextRequest) {
  const session = await lireSession(requete.cookies.get(NOM_COOKIE)?.value);
  if (session) return NextResponse.next();

  // Un appel d'API non authentifié reçoit un 401 franc — pas une redirection
  // vers une page HTML, que le client appelant ne saurait pas interpréter.
  if (requete.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }

  const versConnexion = new URL("/connexion", requete.url);
  // On mémorise la destination pour y revenir après la connexion, en ne
  // gardant que le chemin : une URL complète permettrait de rediriger la
  // victime vers un site tiers après authentification.
  versConnexion.searchParams.set(
    "suite",
    requete.nextUrl.pathname + requete.nextUrl.search,
  );
  return NextResponse.redirect(versConnexion);
}

export const config = {
  /**
   * Protège l'administration et ses API d'écriture.
   * Volontairement hors périmètre : `/ecran/*` (mur LED, lecture seule et sans
   * donnée personnelle) et `/aide` (mode d'emploi des officiels).
   */
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
