"use server";

/**
 * Connexion à l'administration.
 *
 * Le mot de passe est vérifié ICI, côté serveur, et ne repart jamais vers le
 * navigateur. Le client ne reçoit qu'un cookie signé, qu'il ne peut ni lire
 * ni forger.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  NOM_COOKIE,
  creerSession,
  motDePasseValide,
  optionsCookie,
} from "@/lib/auth";

export interface EtatConnexion {
  erreur?: string;
}

/**
 * Limitation des tentatives, en mémoire du processus.
 *
 * Imparfait en serverless — chaque instance a son compteur — mais suffisant
 * ici : la vérification PBKDF2 coûte déjà ~200 ms, ce qui plafonne
 * naturellement un essai en force brute à quelques tentatives par seconde.
 * Une limitation partagée (base ou KV) est notée pour l'après-MVP.
 *
 * On RALENTIT, on ne bloque pas. Un blocage dur par adresse verrouillait la
 * table de marque dès que huit mauvais codes partaient du Wi-Fi de la salle
 * — que tout le public partage. Ici, chaque échec au-delà du troisième
 * ajoute un délai (2, 4, 8 s, plafonné), par adresse et pour tout le monde :
 * un essai en force devient interminable, le bon code passe toujours.
 */
const tentatives = new Map<string, { nombre: number; jusqua: number }>();
const FENETRE_MS = 10 * 60 * 1000;
const CLE_GLOBALE = "*";

function echecs(cle: string): number {
  const t = tentatives.get(cle);
  if (!t) return 0;
  if (Date.now() > t.jusqua) {
    tentatives.delete(cle);
    return 0;
  }
  return t.nombre;
}

function compter(cle: string) {
  const t = tentatives.get(cle);
  if (!t || Date.now() > t.jusqua) {
    tentatives.set(cle, { nombre: 1, jusqua: Date.now() + FENETRE_MS });
    return;
  }
  t.nombre++;
}

/** Délai imposé avant de vérifier, selon les échecs récents : 0 jusqu'à 3, puis 2, 4, 8 s au plus. */
function delaiMs(cle: string): number {
  const n = Math.max(echecs(cle) - 3, echecs(CLE_GLOBALE) - 30);
  if (n <= 0) return 0;
  return Math.min(2000 * 2 ** (n - 1), 8000);
}

/**
 * La destination après connexion : un chemin de l'administration, rien
 * d'autre. On RÉSOUT l'URL au lieu de regarder son préfixe : « /\evil.com »
 * ou « /\t/evil.com » commencent par « / » et n'en sont pas moins des
 * adresses externes pour un navigateur.
 */
function cheminInterne(brut: string): string {
  try {
    const u = new URL(brut, "http://interne");
    if (u.origin !== "http://interne") return "/admin";
    if (!u.pathname.startsWith("/admin")) return "/admin";
    return u.pathname + u.search;
  } catch {
    return "/admin";
  }
}

export async function seConnecter(
  _etat: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const motDePasse = String(donnees.get("motdepasse") ?? "");
  const suiteBrute = String(donnees.get("suite") ?? "/admin");

  const entetes = await headers();
  // On identifie le poste par son IP, tronquée : de quoi compter les
  // tentatives sans conserver une donnée nominative.
  const brut = (entetes.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const ip = brut.includes(":")
    ? brut.split(":").slice(0, 4).join(":")
    : brut.split(".").slice(0, 3).join(".");

  const attente = delaiMs(ip);
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));

  if (!(await motDePasseValide(motDePasse))) {
    compter(ip);
    compter(CLE_GLOBALE);
    // Message unique : ne jamais distinguer « mot de passe vide », « mauvais
    // mot de passe » ou « rien n'est configuré » — chaque nuance renseigne.
    return {
      erreur:
        "Code d'accès refusé." +
        (attente > 0 ? " Chaque nouvel essai attend un peu plus longtemps." : ""),
    };
  }

  tentatives.delete(ip);
  const magasin = await cookies();
  magasin.set(NOM_COOKIE, await creerSession(), optionsCookie());

  redirect(cheminInterne(suiteBrute));
}

export async function seDeconnecter() {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE);
  redirect("/connexion");
}
