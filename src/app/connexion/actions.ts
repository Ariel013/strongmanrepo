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
 */
const tentatives = new Map<string, { nombre: number; jusqua: number }>();
const MAX_TENTATIVES = 8;
const BLOCAGE_MS = 5 * 60 * 1000;

function trop(cle: string): boolean {
  const t = tentatives.get(cle);
  if (!t) return false;
  if (Date.now() > t.jusqua) {
    tentatives.delete(cle);
    return false;
  }
  return t.nombre >= MAX_TENTATIVES;
}

function compter(cle: string) {
  const t = tentatives.get(cle);
  if (!t || Date.now() > t.jusqua) {
    tentatives.set(cle, { nombre: 1, jusqua: Date.now() + BLOCAGE_MS });
    return;
  }
  t.nombre++;
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
  const ip = (entetes.get("x-forwarded-for") ?? "local")
    .split(",")[0]
    .trim()
    .split(".")
    .slice(0, 3)
    .join(".");

  if (trop(ip)) {
    return {
      erreur:
        "Trop de tentatives. Patientez cinq minutes avant de réessayer, " +
        "ou rapprochez-vous du responsable du logiciel.",
    };
  }

  if (!(await motDePasseValide(motDePasse))) {
    compter(ip);
    // Message unique : ne jamais distinguer « mot de passe vide », « mauvais
    // mot de passe » ou « rien n'est configuré » — chaque nuance renseigne.
    return { erreur: "Code d'accès refusé." };
  }

  tentatives.delete(ip);
  const magasin = await cookies();
  magasin.set(NOM_COOKIE, await creerSession(), optionsCookie());

  // On n'accepte qu'un chemin interne : une URL absolue permettrait de
  // renvoyer l'officiel vers un site tiers juste après sa connexion.
  const suite =
    suiteBrute.startsWith("/") && !suiteBrute.startsWith("//")
      ? suiteBrute
      : "/admin";
  redirect(suite);
}

export async function seDeconnecter() {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE);
  redirect("/connexion");
}
