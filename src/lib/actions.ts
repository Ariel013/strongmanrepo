"use server";

/**
 * Toutes les écritures de l'application.
 *
 * Chaque action commence par `exigerSession()`. Le middleware bloque déjà
 * l'accès aux pages `/admin`, mais une Server Action est une route HTTP à
 * part entière : elle est appelable directement, sans passer par la page qui
 * l'affiche. Une action qui ferait confiance au middleware serait ouverte.
 *
 * Chaque écriture qui touche un résultat laisse une trace au journal. En cas
 * de réclamation, c'est la seule pièce qui dise ce qui a été saisi et quand.
 */

import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import {
  athlete,
  athleteContact,
  competition,
  journal,
  passage,
} from "./db/schema";
import { NOM_COOKIE, lireSession } from "./auth";

/** Refuse l'action si la session est absente ou expirée. */
async function exigerSession() {
  const magasin = await cookies();
  const session = await lireSession(magasin.get(NOM_COOKIE)?.value);
  if (!session) throw new Error("Non authentifié.");
  return session;
}

/** Empreinte du poste : IP tronquée, assez pour situer, pas pour identifier. */
async function origine(): Promise<string> {
  const e = await headers();
  return (e.get("x-forwarded-for") ?? "local")
    .split(",")[0]
    .trim()
    .split(".")
    .slice(0, 3)
    .join(".");
}

async function tracer(
  action: string,
  cibleTable: string,
  cibleId: string | null,
  details?: unknown,
) {
  try {
    await db.insert(journal).values({
      action,
      cibleTable,
      cibleId,
      details: details ? JSON.stringify(details) : null,
      origine: await origine(),
    });
  } catch {
    // Le journal ne doit jamais faire échouer une saisie : perdre une ligne
    // d'audit est regrettable, perdre une performance en pleine compétition
    // est inacceptable.
  }
}

export interface Retour {
  ok: boolean;
  erreur?: string;
}

/* ── Athlètes ─────────────────────────────────────────────────────────── */

/** Lit un nombre saisi à la française : « 104,5 » vaut 104.5. */
function versNombre(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export async function enregistrerAthlete(
  _etat: Retour,
  donnees: FormData,
): Promise<Retour> {
  await exigerSession();

  const id = String(donnees.get("id") ?? "").trim();
  const nom = String(donnees.get("nom") ?? "").trim().toUpperCase();
  const prenoms = String(donnees.get("prenoms") ?? "").trim();
  const competitionId = String(donnees.get("competitionId") ?? "").trim();

  if (!nom) return { ok: false, erreur: "Le nom est obligatoire." };
  if (!competitionId) return { ok: false, erreur: "Compétition introuvable." };

  const dossard = versNombre(donnees.get("dossard"));
  const poidsCorps = versNombre(donnees.get("poidsCorps"));
  const categorieIdBrut = String(donnees.get("categorieId") ?? "").trim();

  const valeurs = {
    nom,
    prenoms,
    club: String(donnees.get("club") ?? "").trim() || null,
    pays: String(donnees.get("pays") ?? "CIV").trim() || "CIV",
    dossard: dossard === null ? null : Math.trunc(dossard),
    poidsCorps: poidsCorps === null ? null : String(poidsCorps),
    categorieId: categorieIdBrut || null,
    horsClassement: donnees.get("horsClassement") === "on",
  };

  try {
    if (id) {
      await db.update(athlete).set(valeurs).where(eq(athlete.id, id));
      await tracer("athlete.modifie", "athlete", id, { nom, dossard: valeurs.dossard });
    } else {
      const [cree] = await db
        .insert(athlete)
        .values({ ...valeurs, competitionId })
        .returning();
      await tracer("athlete.cree", "athlete", cree.id, { nom });
    }
  } catch (e) {
    const msg = (e as Error).message;
    // L'index unique sur (compétition, dossard) protège d'un doublon de
    // dossard — deux athlètes au même numéro rendraient l'ordre de passage
    // et la feuille de match incohérents.
    if (msg.includes("athlete_dossard_unique")) {
      return {
        ok: false,
        erreur: `Le dossard ${valeurs.dossard} est déjà attribué à un autre athlète.`,
      };
    }
    return { ok: false, erreur: "Enregistrement impossible : " + msg };
  }

  revalidatePath("/admin/athletes");
  revalidatePath("/admin/plateau");
  return { ok: true };
}

export async function supprimerAthlete(id: string): Promise<Retour> {
  await exigerSession();
  await tracer("athlete.supprime", "athlete", id);
  await db.delete(athlete).where(eq(athlete.id, id));
  revalidatePath("/admin/athletes");
  return { ok: true };
}

/**
 * Valide la pesée : le poids constaté fait foi et fixe la catégorie.
 * Une fois validée, la fiche ne doit plus bouger sans décision d'officiel.
 */
export async function validerPesee(
  id: string,
  valide: boolean,
): Promise<Retour> {
  await exigerSession();
  await db
    .update(athlete)
    .set({ peseeValidee: valide })
    .where(eq(athlete.id, id));
  await tracer(valide ? "pesee.validee" : "pesee.annulee", "athlete", id);
  revalidatePath("/admin/athletes");
  return { ok: true };
}

/** Coordonnées personnelles — écrites à part, jamais lues par le public. */
export async function enregistrerContact(
  athleteId: string,
  donnees: { telephone?: string; contactUrgence?: string; commune?: string },
): Promise<Retour> {
  await exigerSession();
  await db
    .insert(athleteContact)
    .values({ athleteId, ...donnees })
    .onConflictDoUpdate({ target: athleteContact.athleteId, set: donnees });
  // Le journal ne recopie pas les coordonnées : tracer une donnée
  // personnelle la duplique dans une table qu'on ne purge jamais.
  await tracer("contact.modifie", "athlete", athleteId);
  return { ok: true };
}

/* ── Plateau ──────────────────────────────────────────────────────────── */

/** Choisit l'épreuve et la catégorie en cours — pilote aussi le mur LED. */
export async function choisirEpreuve(
  competitionId: string,
  epreuveId: string | null,
  categorieId: string | null,
): Promise<Retour> {
  await exigerSession();
  await db
    .update(competition)
    .set({
      epreuveCouranteId: epreuveId,
      categorieCouranteId: categorieId,
      majLe: new Date(),
    })
    .where(eq(competition.id, competitionId));
  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Construit la file de passage d'une épreuve pour une catégorie.
 *
 * Remplace la file existante : on la reconstruit quand l'ordre change (un
 * athlète retiré, une pesée corrigée). Les passages déjà terminés sont
 * conservés — refaire la file ne doit jamais effacer une performance.
 */
export async function construireFile(
  competitionId: string,
  epreuveId: string,
  athleteIdsDansLOrdre: string[],
): Promise<Retour> {
  await exigerSession();

  const existants = await db
    .select()
    .from(passage)
    .where(eq(passage.epreuveId, epreuveId));
  const termines = new Set(
    existants.filter((p) => p.statut === "termine").map((p) => p.athleteId),
  );

  const aSupprimer = existants
    .filter((p) => p.statut !== "termine")
    .map((p) => p.id);
  if (aSupprimer.length > 0) {
    await db.delete(passage).where(
      and(
        eq(passage.epreuveId, epreuveId),
        sql`${passage.id} = any(${aSupprimer})`,
      ),
    );
  }

  const aCreer = athleteIdsDansLOrdre
    .filter((id) => !termines.has(id))
    .map((athleteId, i) => ({
      competitionId,
      epreuveId,
      athleteId,
      ordre: i + 1,
      statut: "avenir",
    }));

  if (aCreer.length > 0) await db.insert(passage).values(aCreer);
  await tracer("file.construite", "epreuve", epreuveId, {
    passages: aCreer.length,
  });

  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/** Appelle un athlète au plateau. Un seul à la fois par catégorie. */
export async function appelerAuPlateau(passageId: string): Promise<Retour> {
  await exigerSession();

  const [cible] = await db.select().from(passage).where(eq(passage.id, passageId));
  if (!cible) return { ok: false, erreur: "Passage introuvable." };

  // Celui qui était au plateau retourne dans la file : deux athlètes
  // simultanés fausseraient le chronomètre et l'affichage public.
  await db
    .update(passage)
    .set({ statut: "avenir" })
    .where(
      and(eq(passage.epreuveId, cible.epreuveId), eq(passage.statut, "plateau")),
    );

  await db
    .update(passage)
    .set({ statut: "plateau" })
    .where(eq(passage.id, passageId));

  await tracer("passage.appele", "passage", passageId);
  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Valide la performance d'un passage.
 *
 * Trois issues : « ok » avec une valeur mesurée, « zero » (a concouru sans
 * rien valider) ou « forfait » (ne s'est pas présenté). Les deux dernières
 * closent le passage sans performance : aucun rang, zéro point.
 */
export async function validerPassage(
  passageId: string,
  resultat:
    | { statut: "ok"; valeur: number; tempsS: number | null; tours?: number[] }
    | { statut: "zero" | "forfait" },
): Promise<Retour> {
  await exigerSession();

  if (resultat.statut === "ok" && !Number.isFinite(resultat.valeur)) {
    return {
      ok: false,
      erreur: "Saisissez la performance mesurée avant de valider.",
    };
  }

  await db
    .update(passage)
    .set({
      statut: "termine",
      resultatStatut: resultat.statut,
      valeur: resultat.statut === "ok" ? resultat.valeur : null,
      tempsS: resultat.statut === "ok" ? resultat.tempsS : null,
      tours: resultat.statut === "ok" ? (resultat.tours ?? []) : [],
      valideLe: new Date(),
    })
    .where(eq(passage.id, passageId));

  await tracer("passage.valide", "passage", passageId, resultat);
  revalidatePath("/admin/plateau");
  revalidatePath("/admin/classement");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Rouvre le dernier passage validé, pour corriger une erreur de saisie.
 * La correction est tracée : c'est précisément ce qu'une réclamation vient
 * contester.
 */
export async function rouvrirPassage(passageId: string): Promise<Retour> {
  await exigerSession();
  const [avant] = await db.select().from(passage).where(eq(passage.id, passageId));
  await db
    .update(passage)
    .set({
      statut: "plateau",
      resultatStatut: null,
      valeur: null,
      tempsS: null,
      tours: [],
      valideLe: null,
    })
    .where(eq(passage.id, passageId));
  await tracer("passage.rouvert", "passage", passageId, {
    ancienResultat: avant
      ? { statut: avant.resultatStatut, valeur: avant.valeur }
      : null,
  });
  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/** Interrompt la compétition (blessure, panne, réclamation). */
export async function suspendre(
  competitionId: string,
  motif: string,
): Promise<Retour> {
  await exigerSession();
  await db
    .update(competition)
    .set({ suspendue: true, motifSuspension: motif || "Suspension" })
    .where(eq(competition.id, competitionId));
  await tracer("competition.suspendue", "competition", competitionId, { motif });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function reprendre(competitionId: string): Promise<Retour> {
  await exigerSession();
  await db
    .update(competition)
    .set({ suspendue: false, motifSuspension: null })
    .where(eq(competition.id, competitionId));
  await tracer("competition.reprise", "competition", competitionId);
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}
