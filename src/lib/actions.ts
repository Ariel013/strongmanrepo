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

import { asc, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import {
  athlete,
  athleteContact,
  categorie,
  clubLogo,
  competition,
  epreuve,
  journal,
  officiel,
  passage,
  programme,
  recompense,
  sortie,
} from "./db/schema";
import { NOM_COOKIE, lireSession } from "./auth";
import { cleRapprochement } from "./import-liste";
import {
  affecterCategorieA,
  placerAuPlateau,
  reconstruireFile,
  remettreEnFile,
} from "./plateau";
import {
  dateFrancaise,
  decimalFacultatif,
  entierFacultatif,
  entierObligatoire,
  heureFrancaise,
  parmi,
  tempsImparti,
  texteFacultatif,
  texteObligatoire,
} from "./validation";

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

/** Les rôles d'officiel reconnus au procès-verbal. */
const ROLES_ADMIS = [
  "directeur", "technique", "arbitrage", "juge",
  "chrono", "secretaire", "regie", "speaker",
] as const;

/** Les contenus qu'un écran public sait afficher. */
const CONTENUS_ADMIS = [
  "attente", "plateau", "ordre", "verdict",
  "classement", "podium", "mire",
] as const;

/** Les nationalités proposées par la fiche athlète. */
const PAYS_ADMIS = [
  "BEN", "BFA", "CMR", "CIV", "USA", "FRA", "GHA",
  "GIN", "ISL", "MLI", "MAR", "NGA", "SEN", "TGO",
] as const;

/** Forme d'un identifiant : tout le reste vient d'ailleurs que de nos écrans. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Reconstruire avec une liste vide EFFACE la file sans rien remettre. Le
  // cas arrive quand aucun athlète n'est rattaché à une catégorie retenue :
  // mieux vaut refuser et le dire que rendre un plateau vide en annonçant
  // « ordre reconstruit ».
  if (athleteIdsDansLOrdre.length === 0)
    return {
      ok: false,
      erreur:
        "Aucun athlète à placer dans cette épreuve : vérifiez que les engagés sont rattachés à une catégorie retenue.",
    };

  const r = await reconstruireFile(
    competitionId,
    epreuveId,
    athleteIdsDansLOrdre,
  );
  await tracer("file.construite", "epreuve", epreuveId, { passages: r.crees });

  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");

  return {
    ok: true,
    erreur:
      r.crees === 0
        ? "Tous les passages de cette épreuve sont déjà validés : l'ordre n'a pas été touché."
        : undefined,
  };
}

/**
 * Appelle un athlète au plateau — un seul à la fois PAR CATÉGORIE.
 *
 * Quand l'épreuve se passe tout le monde mélangé, un athlète de chaque
 * catégorie est au plateau en même temps : c'est ainsi que se déroule l'appel
 * en duo, ici comme sur le mur LED. Renvoyer dans la file tout ce qui était au
 * plateau, sans regarder la catégorie, chasserait le concurrent d'à côté au
 * milieu de son essai.
 */
export async function appelerAuPlateau(passageId: string): Promise<Retour> {
  await exigerSession();
  const r = await placerAuPlateau(passageId);
  if (!r.ok) return r;

  await tracer("passage.appele", "passage", passageId);
  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/** Remet au plateau un passage appelé par erreur, sans résultat. */
export async function renvoyerEnFile(passageId: string): Promise<Retour> {
  await exigerSession();
  await remettreEnFile(passageId);
  await tracer("passage.renvoye", "passage", passageId);
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

/* ── Préparation : identité de la compétition ─────────────────────────── */

export async function enregistrerIdentite(
  competitionId: string,
  champs: {
    date: string;
    heure: string;
    fin: string;
    lieu: string;
    adresse: string;
  },
): Promise<Retour> {
  await exigerSession();

  // La date reste saisie en français courant — c'est ce qui est recopié de
  // l'arrêté fédéral — mais elle n'est plus avalée en silence : une date
  // illisible vidait `debutLe`, et avec elle le compte à rebours et la date
  // affichés sur l'écran d'attente.
  const jour = dateFrancaise(champs.date);
  if (!jour.ok) return { ok: false, erreur: jour.erreur };

  const ouverture = heureFrancaise(champs.heure);
  if (!ouverture.ok) return { ok: false, erreur: ouverture.erreur };

  const cloture = heureFrancaise(champs.fin);
  if (!cloture.ok) return { ok: false, erreur: cloture.erreur };

  const lieu = texteFacultatif(champs.lieu, "Le lieu", 120);
  if (!lieu.ok) return { ok: false, erreur: lieu.erreur };

  const adresse = texteFacultatif(champs.adresse, "L'adresse", 200);
  if (!adresse.ok) return { ok: false, erreur: adresse.erreur };

  /** Une heure sans date ne situe rien : les deux vont ensemble ou pas. */
  const quand = (h: { heures: number; minutes: number } | null) =>
    jour.valeur && h
      ? new Date(
          jour.valeur.annee,
          jour.valeur.mois,
          jour.valeur.jour,
          h.heures,
          h.minutes,
        )
      : null;

  const debut = quand(ouverture.valeur);
  const fin = quand(cloture.valeur);

  // La clôture est le même jour : seule l'heure change. Une compétition qui
  // déborde après minuit se verrait ici, plutôt que d'être devinée.
  if (debut && fin && fin <= debut)
    return {
      ok: false,
      erreur: "L'heure de clôture doit suivre l'heure d'ouverture.",
    };

  await db
    .update(competition)
    .set({
      lieu: lieu.valeur,
      adresse: adresse.valeur,
      debutLe: debut,
      finLe: fin,
      majLe: new Date(),
    })
    .where(eq(competition.id, competitionId));

  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function enregistrerPartenaires(
  competitionId: string,
  partenaires: string,
): Promise<Retour> {
  await exigerSession();
  const r = texteFacultatif(partenaires, "Le bandeau partenaires", 500);
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await db
    .update(competition)
    .set({ partenaires: r.valeur, majLe: new Date() })
    .where(eq(competition.id, competitionId));
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Préparation : épreuves ───────────────────────────────────────────── */

/**
 * Les champs d'une épreuve modifiables depuis la préparation.
 *
 * La liste est explicite, et c'est volontaire : une action générique qui
 * accepterait n'importe quel nom de colonne laisserait écrire `competitionId`
 * ou `position` depuis le navigateur.
 */
const CHAMPS_EPREUVE = {
  nom: "texte",
  mesure: "texte",
  critere: "texte",
  materiel: "texte",
  equipements: "texte",
  passage: "texte",
  niveauxOptions: "texte",
  ateliers: "texte",
  distanceTotale: "texte",
  regleFin: "texte",
  tempsLimiteS: "duree",
  essais: "entier",
  niveau: "booleen",
  tours: "booleen",
} as const;

type ChampEpreuve = keyof typeof CHAMPS_EPREUVE;

/** Les mesures reconnues par le barème — cf. `plusPetitGagne()`. */
const MESURES_ADMISES = [
  "nb_temps",
  "poids",
  "duree",
  "distance",
  "chrono",
  "medley",
] as const;

export async function modifierEpreuve(
  id: string,
  champ: ChampEpreuve,
  valeur: string | boolean,
): Promise<Retour> {
  await exigerSession();
  const type = CHAMPS_EPREUVE[champ];
  if (!type) return { ok: false, erreur: "Champ inconnu." };

  let v: unknown;
  if (type === "booleen") {
    v = Boolean(valeur);
  } else {
    const brut = String(valeur);
    if (champ === "nom") {
      const r = texteObligatoire(brut, "Le nom de l'épreuve", 60);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
    } else if (champ === "mesure") {
      const r = parmi(brut, MESURES_ADMISES, "Mesure");
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
    } else if (champ === "passage") {
      const r = parmi(brut, ["groupe", "melange"] as const, "Passage");
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
    } else if (type === "duree") {
      const r = tempsImparti(brut);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
    } else if (type === "entier") {
      const r = entierObligatoire(brut, "Essais par athlète", 1, 9);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
    } else {
      // Critère, matériel, équipements, ateliers… : du texte libre, mais borné.
      const r = texteFacultatif(brut, "Ce champ", 2000);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur ?? "";
    }
  }

  await db
    .update(epreuve)
    .set({ [champ]: v })
    .where(eq(epreuve.id, id));
  await tracer("epreuve.modifiee", "epreuve", id, { champ });

  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function ajouterEpreuve(
  competitionId: string,
  medley = false,
): Promise<Retour> {
  await exigerSession();

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${epreuve.position}), 0)` })
    .from(epreuve)
    .where(eq(epreuve.competitionId, competitionId));

  await db.insert(epreuve).values({
    competitionId,
    nom: medley ? "Medley" : "Nouvelle épreuve",
    mesure: medley ? "medley" : "nb_temps",
    tempsLimiteS: medley ? 90 : 60,
    essais: 1,
    passage: "groupe",
    tours: !medley,
    critere: medley
      ? "Distance parcourue dans le temps imparti, mesurée à la sortie du dernier atelier ; à distance égale, le temps le plus rapide"
      : "",
    position: max + 1,
  });
  await tracer("epreuve.ajoutee", "epreuve", null, { medley });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function supprimerEpreuve(id: string): Promise<Retour> {
  await exigerSession();
  await db.delete(epreuve).where(eq(epreuve.id, id));
  await tracer("epreuve.supprimee", "epreuve", id);
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Préparation : groupes de poids ───────────────────────────────────── */

export async function modifierCategorie(
  id: string,
  champ: "nom" | "poidsMin" | "poidsMax" | "active",
  valeur: string | boolean,
): Promise<Retour> {
  await exigerSession();

  let v: unknown;
  if (champ === "active") {
    v = Boolean(valeur);
  } else if (champ === "nom") {
    const r = texteObligatoire(String(valeur), "Le nom du groupe", 60);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    v = r.valeur;
  } else {
    const quoi = champ === "poidsMin" ? "Poids min" : "Poids max";
    const r = decimalFacultatif(String(valeur), quoi, 20, 400);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    v = r.valeur;

    // Une borne basse au-dessus de la borne haute ne décrit aucun athlète :
    // la catégorie deviendrait vide sans que rien ne le signale.
    const [actuelle] = await db
      .select()
      .from(categorie)
      .where(eq(categorie.id, id));
    if (actuelle) {
      const min = champ === "poidsMin" ? (v as number | null) : actuelle.poidsMin;
      const max = champ === "poidsMax" ? (v as number | null) : actuelle.poidsMax;
      if (min !== null && max !== null && min >= max)
        return {
          ok: false,
          erreur: `Bornes impossibles : le poids min (${min}) doit rester sous le poids max (${max}).`,
        };
    }
  }

  await db
    .update(categorie)
    .set({ [champ]: v })
    .where(eq(categorie.id, id));
  await tracer("categorie.modifiee", "categorie", id, { champ });

  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function ajouterCategorie(
  competitionId: string,
): Promise<Retour> {
  await exigerSession();
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${categorie.position}), 0)` })
    .from(categorie)
    .where(eq(categorie.competitionId, competitionId));

  await db.insert(categorie).values({
    competitionId,
    nom: "Nouveau groupe",
    position: max + 1,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Supprime une catégorie. Les athlètes qui y étaient ne sont pas supprimés :
 * `categorie_id` retombe à `null` (voir `onDelete: "set null"`) et ils
 * réapparaissent dans « athlètes sans catégorie », où la table les réaffecte.
 */
export async function supprimerCategorie(id: string): Promise<Retour> {
  await exigerSession();
  await db.delete(categorie).where(eq(categorie.id, id));
  await tracer("categorie.supprimee", "categorie", id);
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Préparation : officiels ──────────────────────────────────────────── */

export async function ajouterOfficiel(competitionId: string): Promise<Retour> {
  await exigerSession();
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${officiel.position}), 0)` })
    .from(officiel)
    .where(eq(officiel.competitionId, competitionId));
  await db
    .insert(officiel)
    .values({ competitionId, nom: "", role: "juge", position: max + 1 });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function modifierOfficiel(
  id: string,
  champ: "nom" | "role",
  valeur: string,
): Promise<Retour> {
  await exigerSession();

  // Le nom peut rester vide : les postes sont créés d'avance et nommés plus
  // tard. Le rôle, lui, décide de la place au procès-verbal.
  let v: string;
  if (champ === "role") {
    const r = parmi(valeur, ROLES_ADMIS, "Rôle");
    if (!r.ok) return { ok: false, erreur: r.erreur };
    v = r.valeur;
  } else {
    const r = texteFacultatif(valeur, "Le nom de l'officiel", 80);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    v = r.valeur ?? "";
  }

  await db
    .update(officiel)
    .set({ [champ]: v })
    .where(eq(officiel.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function supprimerOfficiel(id: string): Promise<Retour> {
  await exigerSession();
  await db.delete(officiel).where(eq(officiel.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ── Préparation : programme de la journée ────────────────────────────── */

export async function ajouterProgramme(
  competitionId: string,
): Promise<Retour> {
  await exigerSession();
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${programme.position}), 0)` })
    .from(programme)
    .where(eq(programme.competitionId, competitionId));
  await db
    .insert(programme)
    .values({ competitionId, heure: "", texte: "", position: max + 1 });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function modifierProgramme(
  id: string,
  champ: "heure" | "texte",
  valeur: string,
): Promise<Retour> {
  await exigerSession();
  // L'heure du programme est lue par un humain, jamais comparée : « 14h00 »
  // comme « vers midi » sont acceptables. On borne, c'est tout.
  const r = texteFacultatif(
    valeur,
    champ === "heure" ? "L'heure" : "L'intitulé",
    champ === "heure" ? 20 : 200,
  );
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await db
    .update(programme)
    .set({ [champ]: r.valeur ?? "" })
    .where(eq(programme.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function supprimerProgramme(id: string): Promise<Retour> {
  await exigerSession();
  await db.delete(programme).where(eq(programme.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Préparation : récompenses ────────────────────────────────────────── */

/** Les trois médailles et primes officielles, valeurs de rétablissement. */
const RECOMPENSES_OFFICIELLES = [
  { rang: 1, titre: "Médaille d'or", prime: "500 000 fr", lot: "Trophée du champion" },
  { rang: 2, titre: "Médaille d'argent", prime: "300 000 fr", lot: "" },
  { rang: 3, titre: "Médaille de bronze", prime: "200 000 fr", lot: "" },
];

export async function ajouterRecompense(
  competitionId: string,
): Promise<Retour> {
  await exigerSession();
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${recompense.rang}), 0)` })
    .from(recompense)
    .where(eq(recompense.competitionId, competitionId));
  await db.insert(recompense).values({ competitionId, rang: max + 1 });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function modifierRecompense(
  id: string,
  champ: "titre" | "prime" | "lot",
  valeur: string,
): Promise<Retour> {
  await exigerSession();
  const r = texteFacultatif(valeur, "Ce champ", 120);
  if (!r.ok) return { ok: false, erreur: r.erreur };
  await db
    .update(recompense)
    .set({ [champ]: r.valeur ?? "" })
    .where(eq(recompense.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function supprimerRecompense(id: string): Promise<Retour> {
  await exigerSession();
  await db.delete(recompense).where(eq(recompense.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function retablirRecompenses(
  competitionId: string,
): Promise<Retour> {
  await exigerSession();
  await db.delete(recompense).where(eq(recompense.competitionId, competitionId));
  await db
    .insert(recompense)
    .values(RECOMPENSES_OFFICIELLES.map((r) => ({ ...r, competitionId })));
  await tracer("recompenses.retablies", "competition", competitionId);
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Régie : sorties vidéo et thème ───────────────────────────────────── */

export async function ajouterSortie(competitionId: string): Promise<Retour> {
  await exigerSession();
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${sortie.position}), 0)` })
    .from(sortie)
    .where(eq(sortie.competitionId, competitionId));
  await db.insert(sortie).values({ competitionId, position: max + 1 });
  revalidatePath("/admin/regie");
  return { ok: true };
}

export async function modifierSortie(
  id: string,
  champ: "nom" | "contenu",
  valeur: string,
): Promise<Retour> {
  await exigerSession();

  let v: string;
  if (champ === "contenu") {
    // Un contenu inconnu donnerait un écran 404 sur le mur LED.
    const r = parmi(valeur, CONTENUS_ADMIS, "Contenu diffusé");
    if (!r.ok) return { ok: false, erreur: r.erreur };
    v = r.valeur;
  } else {
    const r = texteObligatoire(valeur, "Le nom de la sortie", 60);
    if (!r.ok) return { ok: false, erreur: r.erreur };
    v = r.valeur;
  }

  await db
    .update(sortie)
    .set({ [champ]: v })
    .where(eq(sortie.id, id));
  revalidatePath("/admin/regie");
  return { ok: true };
}

export async function supprimerSortie(id: string): Promise<Retour> {
  await exigerSession();
  await db.delete(sortie).where(eq(sortie.id, id));
  revalidatePath("/admin/regie");
  return { ok: true };
}

export async function basculerTheme(
  competitionId: string,
  vers: "nuit" | "jour",
): Promise<Retour> {
  await exigerSession();
  await db
    .update(competition)
    .set({ themeEcran: vers, majLe: new Date() })
    .where(eq(competition.id, competitionId));
  revalidatePath("/admin/regie");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Athlètes : retouches de fiche ────────────────────────────────────── */

/**
 * Les champs de fiche modifiables au fil de la frappe.
 *
 * Le formulaire complet (`enregistrerAthlete`) reste la voie normale ; ces
 * retouches servent aux écrans où la table corrige une seule case au milieu
 * d'une liste — un dossard, un club — sans rouvrir toute la fiche.
 */
export async function modifierAthlete(
  id: string,
  champ:
    | "nom"
    | "prenoms"
    | "club"
    | "pays"
    | "dossard"
    | "note"
    | "tailleCm"
    | "age"
    | "poidsDeclare",
  valeur: string,
): Promise<Retour> {
  await exigerSession();

  let v: unknown;
  switch (champ) {
    case "nom": {
      // Le nom part en capitales sur le mur LED ; vide, l'athlète y devient
      // une ligne anonyme que le speaker ne peut pas annoncer.
      const r = texteObligatoire(valeur, "Le nom", 60);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur.toUpperCase();
      break;
    }
    case "prenoms": {
      const r = texteFacultatif(valeur, "Les prénoms", 80);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur ?? "";
      break;
    }
    case "club": {
      const r = texteFacultatif(valeur, "Le club", 60);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
      break;
    }
    case "note": {
      const r = texteFacultatif(valeur, "La note", 300);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
      break;
    }
    case "pays": {
      const r = parmi(valeur, PAYS_ADMIS, "Nationalité");
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
      break;
    }
    case "dossard": {
      const r = entierFacultatif(valeur, "Le dossard", 1, 9999);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
      break;
    }
    case "tailleCm": {
      const r = entierFacultatif(valeur, "La taille (en cm)", 100, 250);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
      break;
    }
    case "age": {
      const r = entierFacultatif(valeur, "L'âge", 10, 99);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur;
      break;
    }
    case "poidsDeclare": {
      // Le poids ANNONCÉ à l'inscription. Il ne classe rien et ne décide
      // d'aucune catégorie : seule la pesée du jour J fait foi. Il sert à
      // repérer l'écart entre ce qui était annoncé et ce qui est constaté.
      const r = decimalFacultatif(valeur, "Le poids déclaré", 20, 400);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      v = r.valeur === null ? null : String(r.valeur);
      break;
    }
    default:
      return { ok: false, erreur: "Champ inconnu." };
  }

  try {
    await db
      .update(athlete)
      .set({ [champ]: v })
      .where(eq(athlete.id, id));
  } catch {
    // Le seul échec attendu est le dossard déjà pris : l'index unique est là
    // pour ça. Deux athlètes au même numéro rendraient l'ordre de passage et
    // l'appel au micro ambigus.
    return {
      ok: false,
      erreur: `Le dossard ${valeur} est déjà attribué à un autre athlète.`,
    };
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/** Le niveau déclaré par l'athlète pour une épreuve à niveaux. */
export async function definirNiveau(
  athleteId: string,
  epreuveId: string,
  valeur: string,
): Promise<Retour> {
  await exigerSession();

  const [a] = await db.select().from(athlete).where(eq(athlete.id, athleteId));
  if (!a) return { ok: false, erreur: "Athlète introuvable." };

  let niveaux: Record<string, string> = {};
  try {
    niveaux = a.niveaux ? JSON.parse(a.niveaux) : {};
  } catch {
    niveaux = {};
  }
  if (valeur) niveaux[epreuveId] = valeur;
  else delete niveaux[epreuveId];

  await db
    .update(athlete)
    .set({ niveaux: JSON.stringify(niveaux) })
    .where(eq(athlete.id, athleteId));

  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/** Retire la marque « À vérifier » d'une fiche relue par un officiel. */
export async function marquerVerifiee(id: string): Promise<Retour> {
  await exigerSession();
  await db.update(athlete).set({ aVerifier: false }).where(eq(athlete.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Efface tous les dossards pour les ressaisir à la main.
 *
 * L'ordre de passage de la première épreuve suit les dossards croissants :
 * les vider revient à déclarer que l'ordre n'est pas encore arrêté.
 */
export async function viderDossards(competitionId: string): Promise<Retour> {
  await exigerSession();
  await db
    .update(athlete)
    .set({ dossard: null })
    .where(eq(athlete.competitionId, competitionId));
  await tracer("dossards.vides", "competition", competitionId);
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Affecte une catégorie à plusieurs athlètes d'un coup.
 *
 * `"hors"` déclare l'athlète indépendant : il concourt, ses performances sont
 * enregistrées, mais il ne figure dans aucun classement.
 */
export async function affecterCategorie(
  athleteIds: string[],
  cible: string,
): Promise<Retour> {
  await exigerSession();
  if (athleteIds.length === 0)
    return { ok: false, erreur: "Aucun athlète sélectionné." };

  // La catégorie est relue en base avant d'être écrite. Sans cette lecture,
  // une valeur quelconque venue du navigateur partirait dans la colonne :
  // au mieux une erreur de format en pleine pesée, au pire un athlète
  // rattaché à la catégorie d'une autre compétition.
  if (cible !== "" && cible !== "hors") {
    // Vérifier la forme AVANT d'interroger : PostgreSQL rejette un uuid
    // malformé par une erreur brute, qui remonterait à la table sous la forme
    // d'un écran cassé plutôt que d'un message.
    if (!UUID.test(cible)) return { ok: false, erreur: "Catégorie inconnue." };
    const [cat] = await db
      .select({ id: categorie.id })
      .from(categorie)
      .where(eq(categorie.id, cible));
    if (!cat) return { ok: false, erreur: "Catégorie inconnue." };
  }

  const r = await affecterCategorieA(athleteIds, cible);
  if (!r.ok) return r;
  await tracer("categorie.affectee", "athlete", null, {
    nombre: athleteIds.length,
    cible,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Range les athlètes dans leur groupe d'après le poids relevé à la pesée.
 *
 * Bornes du schéma : `poidsMin < poids <= poidsMax`, la borne haute inclusive
 * et la basse exclusive — « −100 kg » et « +100 kg » ne se recouvrent donc
 * pas à 100,0 kg exactement. Un athlète non pesé n'est pas touché : le
 * deviner d'après son poids déclaré reviendrait à classer sur une annonce.
 */
export async function repartirParPoids(
  competitionId: string,
  athleteIds: string[],
): Promise<Retour> {
  await exigerSession();

  const cats = await db
    .select()
    .from(categorie)
    .where(eq(categorie.competitionId, competitionId))
    .orderBy(asc(categorie.position));
  const actives = cats.filter((c) => c.active);
  if (actives.length === 0)
    return { ok: false, erreur: "Aucune catégorie retenue." };

  const tous = await db
    .select()
    .from(athlete)
    .where(eq(athlete.competitionId, competitionId));
  const vises =
    athleteIds.length > 0
      ? tous.filter((a) => athleteIds.includes(a.id))
      : tous;

  let ranges = 0;
  let sansPoids = 0;
  for (const a of vises) {
    const p = a.poidsCorps === null ? null : Number.parseFloat(a.poidsCorps);
    if (p === null || !Number.isFinite(p)) {
      sansPoids++;
      continue;
    }
    const cat = actives.find(
      (c) =>
        (c.poidsMin === null || p > c.poidsMin) &&
        (c.poidsMax === null || p <= c.poidsMax),
    );
    if (!cat) continue;
    await db
      .update(athlete)
      .set({ categorieId: cat.id })
      .where(eq(athlete.id, a.id));
    ranges++;
  }

  await tracer("categories.reparties", "competition", competitionId, {
    ranges,
    sansPoids,
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");

  return {
    ok: true,
    erreur:
      sansPoids > 0
        ? `${ranges} athlète(s) rangé(s). ${sansPoids} sans poids pesé : la pesée doit passer avant.`
        : undefined,
  };
}

/* ── Photos et logos ──────────────────────────────────────────────────── */

/**
 * Dépose une image sur Vercel Blob et rend son URL publique.
 *
 * Sans jeton (poste local), l'appel échoue proprement et le dit : c'est la
 * promesse faite dans `.env.example`. Une photo manquante ne doit jamais
 * empêcher d'inscrire un athlète — la vignette retombe sur ses initiales.
 */
async function deposer(
  fichier: File,
  prefixe: string,
): Promise<{ url?: string; erreur?: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      erreur:
        "Aucun espace de stockage d'images configuré sur ce poste " +
        "(BLOB_READ_WRITE_TOKEN). La fiche reste utilisable sans photo.",
    };
  }
  if (!fichier.type.startsWith("image/")) {
    return { erreur: "Ce fichier n'est pas une image." };
  }
  // 8 Mo : large pour une photo d'accréditation, assez bas pour qu'un envoi
  // depuis un téléphone au bord du plateau n'immobilise pas la table.
  if (fichier.size > 8 * 1024 * 1024) {
    return { erreur: "Image trop lourde (8 Mo maximum)." };
  }

  /**
   * Le nom de fichier vient du navigateur : il ne doit jamais composer un
   * chemin de dépôt tel quel. « ../../ » ou une suite de caractères exotiques
   * y rangerait l'image hors du préfixe voulu. On ne garde que des lettres,
   * des chiffres, le tiret et le point, et l'horodatage assure l'unicité.
   */
  const nomSur =
    (fichier.name.split("/").pop() ?? "image")
      .replace(/[^a-zA-Z0-9.-]/g, "-")
      .replace(/^[.-]+/, "")
      .slice(-60) || "image";

  /**
   * Le dépôt lui-même est gardé.
   *
   * Sans ce `try`, une erreur de Vercel Blob — jeton invalide, magasin
   * introuvable, quota, réseau — remontait en exception hors de la Server
   * Action. Le navigateur n'en recevait qu'un échec de transport opaque, et
   * l'officiel un « Envoi impossible » qui ne disait rien de la cause. Une
   * panne de stockage doit se nommer, comme le reste.
   */
  try {
    const { put } = await import("@vercel/blob");
    const depot = await put(`${prefixe}/${Date.now()}-${nomSur}`, fichier, {
      access: "public",
      addRandomSuffix: true,
    });
    return { url: depot.url };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    await tracer("photo.echec", "competition", null, {
      prefixe,
      cause: msg.slice(0, 200),
    });

    // Le magasin a été créé en mode privé. Un blob privé exige une
    // authentification pour être LU — or les écrans du mur LED n'ont aucune
    // session : la photo y resterait invisible même déposée. C'est donc le
    // magasin qu'il faut changer, pas le code.
    if (/private store|private access|public access on a private/i.test(msg))
      return {
        erreur:
          "Le magasin d'images est configuré en accès PRIVÉ. Les photos " +
          "s'affichent sur le mur LED, qui n'a pas de session : elles doivent " +
          "être lisibles par URL. Créez un magasin Blob en accès PUBLIC " +
          "(le mode se choisit à la création), reliez-le au projet, puis " +
          "redéployez.",
      };
    if (/access denied|unauthorized|invalid token|forbidden/i.test(msg))
      return {
        erreur:
          "Le stockage d'images refuse le jeton : BLOB_READ_WRITE_TOKEN ne " +
          "correspond pas au magasin de ce projet. Recopiez-le depuis " +
          "Vercel → Storage → votre magasin, puis redéployez.",
      };
    if (/not found|no such store|store.*exist/i.test(msg))
      return {
        erreur:
          "Magasin d'images introuvable : il a peut-être été supprimé, ou le " +
          "jeton pointe vers un autre projet.",
      };
    if (/quota|limit exceeded|too large|payload/i.test(msg))
      return {
        erreur:
          "Le stockage d'images a refusé le fichier (quota ou taille). " +
          "Essayez une image plus légère.",
      };
    return {
      erreur: `Le stockage d'images a échoué : ${msg.slice(0, 160) || "cause inconnue"}`,
    };
  }
}

export async function televerserPhoto(
  athleteId: string,
  donnees: FormData,
): Promise<Retour> {
  await exigerSession();
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0)
    return { ok: false, erreur: "Aucun fichier reçu." };

  const { url, erreur } = await deposer(fichier, "athletes");
  if (!url) return { ok: false, erreur };

  await db.update(athlete).set({ photoUrl: url }).where(eq(athlete.id, athleteId));
  await tracer("photo.deposee", "athlete", athleteId);
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

export async function televerserLogo(
  competitionId: string,
  club: string,
  donnees: FormData,
): Promise<Retour> {
  await exigerSession();
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0)
    return { ok: false, erreur: "Aucun fichier reçu." };

  const { url, erreur } = await deposer(fichier, "clubs");
  if (!url) return { ok: false, erreur };

  await db
    .insert(clubLogo)
    .values({ competitionId, club, logoUrl: url })
    .onConflictDoUpdate({
      target: [clubLogo.competitionId, clubLogo.club],
      set: { logoUrl: url },
    });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Athlètes : fiches et pesée ───────────────────────────────────────── */

/** Crée une fiche vierge : le nom est saisi ensuite, directement dans la liste. */
export async function ajouterAthleteVierge(
  competitionId: string,
): Promise<Retour> {
  await exigerSession();
  const [cree] = await db
    .insert(athlete)
    .values({ competitionId, nom: "NOUVEL ATHLÈTE", prenoms: "" })
    .returning();
  await tracer("athlete.cree", "athlete", cree.id, { vierge: true });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Déclare un athlète invité — il concourt hors classement.
 *
 * Explicite, jamais déduit de la nationalité : un invité étranger peut très
 * bien devoir être classé, et un local peut concourir hors match.
 */
export async function basculerInvite(
  id: string,
  horsClassement: boolean,
): Promise<Retour> {
  await exigerSession();
  await db.update(athlete).set({ horsClassement }).where(eq(athlete.id, id));
  await tracer("athlete.participation", "athlete", id, { horsClassement });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Le poids relevé à la bascule.
 *
 * Il ne déclenche PAS l'affectation de catégorie : c'est la validation de la
 * pesée qui la décide, sous la responsabilité de l'officiel. Ranger
 * automatiquement à la frappe ferait sauter un athlète de groupe pendant que
 * la table corrige une virgule.
 */
export async function enregistrerPoids(
  id: string,
  poids: string,
): Promise<Retour> {
  await exigerSession();
  const r = decimalFacultatif(poids, "Le poids", 20, 400);
  if (!r.ok) return { ok: false, erreur: r.erreur };

  await db
    .update(athlete)
    .set({ poidsCorps: r.valeur === null ? null : String(r.valeur) })
    .where(eq(athlete.id, id));
  await tracer("pesee.poids", "athlete", id, { poids: r.valeur });
  revalidatePath("/admin", "layout");
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/**
 * Charge tous les athlètes dans toutes les épreuves d'un coup.
 *
 * Les files déjà construites ne sont pas touchées : un ordre remis à zéro en
 * pleine compétition renverrait au plateau des athlètes déjà passés. Seules
 * les épreuves sans aucun passage sont préparées.
 */
export async function preparerToutes(competitionId: string): Promise<Retour> {
  await exigerSession();

  const eps = await db
    .select()
    .from(epreuve)
    .where(eq(epreuve.competitionId, competitionId))
    .orderBy(asc(epreuve.position));

  const cats = await db
    .select()
    .from(categorie)
    .where(eq(categorie.competitionId, competitionId))
    .orderBy(asc(categorie.position));
  const actives = cats.filter((c) => c.active);

  const tous = await db
    .select()
    .from(athlete)
    .where(eq(athlete.competitionId, competitionId))
    .orderBy(asc(athlete.dossard), asc(athlete.nom));

  const placables = tous.filter((a) =>
    actives.some((c) => c.id === a.categorieId),
  );

  /**
   * Les raisons de ne rien faire sont comptées séparément.
   *
   * Elles se ressemblent à l'écran — « rien ne s'est passé » — mais elles
   * appellent des gestes opposés : refaire l'ordre, ou aller affecter des
   * catégories. Les confondre dans un seul message a déjà coûté une
   * après-midi : la table a cliqué quatre fois, lu « tout avait déjà un ordre
   * de passage », et trouvé le plateau vide.
   */
  let preparees = 0;
  let dejaFaites = 0;

  for (const ep of eps) {
    const [{ compte }] = await db
      .select({ compte: sql<number>`count(*)::int` })
      .from(passage)
      .where(eq(passage.epreuveId, ep.id));
    if (compte > 0) {
      dejaFaites++;
      continue;
    }

    // Ordre de départ : dossards croissants, catégorie par catégorie. Les
    // épreuves suivantes seront reconstruites depuis le plateau, où les
    // points acquis sont connus.
    const aCreer = actives.flatMap((cat) =>
      tous
        .filter((a) => a.categorieId === cat.id)
        .map((a, i) => ({
          competitionId,
          epreuveId: ep.id,
          athleteId: a.id,
          ordre: i + 1,
          statut: "avenir",
        })),
    );
    if (aCreer.length === 0) continue;
    await db.insert(passage).values(aCreer);
    preparees++;
  }

  await tracer("epreuves.prechargees", "competition", competitionId, {
    preparees,
    dejaFaites,
    placables: placables.length,
  });
  revalidatePath("/admin/plateau");
  revalidatePath("/ecran", "layout");

  if (preparees > 0)
    return {
      ok: true,
      erreur:
        dejaFaites > 0
          ? `${preparees} épreuve(s) préchargée(s). ${dejaFaites} avaient déjà un ordre : elles n'ont pas été touchées.`
          : undefined,
    };

  // Rien n'a été créé : dire POURQUOI, et quoi faire ensuite.
  if (eps.length === 0)
    return { ok: false, erreur: "Aucune épreuve au programme (étape 1)." };
  if (actives.length === 0)
    return {
      ok: false,
      erreur: "Aucune catégorie retenue : sélectionnez-en une à l'étape 2.",
    };
  if (tous.length === 0)
    return { ok: false, erreur: "Aucun athlète engagé (étape 4)." };
  if (placables.length === 0)
    return {
      ok: false,
      erreur: `Aucun des ${tous.length} athlètes n'est rattaché à une catégorie retenue : affectez-les à l'étape Athlètes, ou validez la pesée.`,
    };
  return {
    ok: true,
    erreur:
      "Toutes les épreuves avaient déjà un ordre de passage : rien n'a été touché.",
  };
}

/* ── Chronomètre ──────────────────────────────────────────────────────── */

/**
 * Publie l'état du chronomètre pour le mur LED.
 *
 * Seul l'instant de départ part en base : chaque écran calcule lui-même
 * l'affichage. Envoyer le temps écoulé à chaque dixième saturerait la base et
 * afficherait quand même un compteur en retard d'un aller-retour réseau.
 */
export async function majChrono(
  competitionId: string,
  etat:
    | { phase: "pret"; dureeS: number }
    | { phase: "encours"; dureeS: number; debutLe: number }
    | { phase: "arrete"; dureeS: number; arretS: number },
): Promise<Retour> {
  await exigerSession();
  await db
    .update(competition)
    .set({
      chronoPhase: etat.phase,
      chronoDureeS: etat.dureeS,
      chronoDebutLe: etat.phase === "encours" ? new Date(etat.debutLe) : null,
      chronoArretS: etat.phase === "arrete" ? etat.arretS : null,
    })
    .where(eq(competition.id, competitionId));
  revalidatePath("/ecran", "layout");
  return { ok: true };
}

/* ── Import d'une liste d'engagés ─────────────────────────────────────── */

export interface ResumeImport {
  ajoutes: number;
  fusionnes: number;
  ignores: number;
  aVerifier: number;
}

/**
 * Écrit les lignes retenues à l'écran de vérification.
 *
 * Deux règles, héritées du poste d'origine :
 *
 * 1. **Une fiche existante n'est jamais écrasée, seulement complétée.** Si le
 *    club est déjà saisi et que le fichier en propose un autre, celui de la
 *    base gagne — c'est la table qui l'a relu, pas le fichier.
 * 2. **Le poids lu reste un poids DÉCLARÉ.** Il va dans `poidsDeclare`,
 *    jamais dans `poidsCorps` : seule la pesée du jour J fait foi, et un
 *    classement bâti sur une annonce serait contestable.
 */
export async function importerAthletes(
  competitionId: string,
  lignes: {
    nom: string;
    prenoms: string;
    club: string;
    poids: string;
    telephone: string;
    urgence: string;
    /** La ligne portait un doute : la fiche naîtra « À vérifier ». */
    doute: boolean;
    /** Compléter la fiche existante plutôt que l'ignorer. */
    fusionner: boolean;
  }[],
): Promise<Retour & { resume?: ResumeImport }> {
  await exigerSession();

  const existants = await db
    .select()
    .from(athlete)
    .where(eq(athlete.competitionId, competitionId));
  const parCle = new Map(
    existants.map((a) => [cleRapprochement(a.nom, a.prenoms), a]),
  );

  const resume: ResumeImport = {
    ajoutes: 0,
    fusionnes: 0,
    ignores: 0,
    aVerifier: 0,
  };

  for (const l of lignes) {
    const nom = l.nom.trim().toUpperCase();
    if (!nom) {
      resume.ignores++;
      continue;
    }
    const poids = l.poids.trim().replace(",", ".");
    const poidsValide =
      poids && Number.isFinite(Number.parseFloat(poids)) ? poids : null;

    const deja = parCle.get(cleRapprochement(nom, l.prenoms));

    if (deja) {
      if (!l.fusionner) {
        resume.ignores++;
        continue;
      }
      // Complément, pas remplacement : `??` sur ce qui est déjà en base.
      await db
        .update(athlete)
        .set({
          prenoms: deja.prenoms || l.prenoms.trim(),
          club: deja.club ?? (l.club.trim() || null),
          poidsDeclare: deja.poidsDeclare ?? poidsValide,
        })
        .where(eq(athlete.id, deja.id));
      if (l.telephone.trim() || l.urgence.trim())
        await db
          .insert(athleteContact)
          .values({
            athleteId: deja.id,
            telephone: l.telephone.trim() || null,
            contactUrgence: l.urgence.trim() || null,
          })
          .onConflictDoNothing();
      resume.fusionnes++;
      continue;
    }

    const [cree] = await db
      .insert(athlete)
      .values({
        competitionId,
        nom,
        prenoms: l.prenoms.trim(),
        club: l.club.trim() || null,
        poidsDeclare: poidsValide,
        aVerifier: l.doute,
      })
      .returning();

    if (l.telephone.trim() || l.urgence.trim())
      await db.insert(athleteContact).values({
        athleteId: cree.id,
        telephone: l.telephone.trim() || null,
        contactUrgence: l.urgence.trim() || null,
      });

    parCle.set(cleRapprochement(nom, l.prenoms), cree);
    resume.ajoutes++;
    if (l.doute) resume.aVerifier++;
  }

  await tracer("athletes.importes", "competition", competitionId, resume);
  revalidatePath("/admin", "layout");
  return { ok: true, resume };
}
