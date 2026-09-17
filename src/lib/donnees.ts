/**
 * Lectures de la base — la seule porte d'entrée des écrans vers les données.
 *
 * Aucun composant ne fait de requête lui-même : tout passe ici. C'est ce qui
 * permet de garantir, en un seul endroit, que les écrans publics ne reçoivent
 * jamais un téléphone ni un contact d'urgence.
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  athlete,
  athleteContact,
  categorie,
  clubLogo,
  competition,
  epreuve,
  officiel,
  passage,
  programme,
  recompense,
  sortie,
} from "./db/schema";
import { ageDe } from "./age";
import { couleurCategorie } from "./charte";
import {
  classementEpreuve,
  classementGeneral,
  ordreDePassage,
  type AthleteClassable,
  type LigneEpreuve,
  type LigneGenerale,
  type Mesure,
  type Resultat,
  versMesure,
} from "./classement";

/* ── Vues publiques ───────────────────────────────────────────────────── */

/**
 * Un athlète tel qu'il peut être affiché n'importe où, mur LED compris.
 * Aucune donnée personnelle : ce type est la garantie par construction.
 */
export interface AthletePublic {
  id: string;
  nom: string;
  prenoms: string;
  club: string | null;
  pays: string;
  dossard: number | null;
  poidsCorps: number | null;
  categorieId: string | null;
  horsClassement: boolean;
  peseeValidee: boolean;
  photoUrl: string | null;
}

export interface EpreuveVue {
  id: string;
  nom: string;
  mesure: Mesure;
  tempsLimiteS: number | null;
  essais: number;
  critere: string | null;
  position: number;
}

export interface CategorieVue {
  id: string;
  nom: string;
  poidsMin: number | null;
  poidsMax: number | null;
  active: boolean;
  position: number;
  /** Toujours renseignée : la couleur enregistrée, sinon celle du rang. */
  couleur: string;
}

/** Le décimal de Postgres arrive en chaîne : on le convertit à la lecture. */
const nombre = (v: string | number | null): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/* ── Compétition ──────────────────────────────────────────────────────── */

/**
 * La compétition courante. Le MVP n'en gère qu'une : on prend la plus
 * récente plutôt qu'un identifiant codé en dur, pour que le jour où il y en
 * a plusieurs, seule cette fonction change.
 */
export async function competitionCourante() {
  const [c] = await db
    .select()
    .from(competition)
    .orderBy(asc(competition.creeLe))
    .limit(1);
  return c ?? null;
}

export async function epreuvesDe(competitionId: string): Promise<EpreuveVue[]> {
  const lignes = await db
    .select()
    .from(epreuve)
    .where(eq(epreuve.competitionId, competitionId))
    .orderBy(asc(epreuve.position));
  return lignes.map((e) => ({
    id: e.id,
    nom: e.nom,
    mesure: versMesure(e.mesure),
    tempsLimiteS: e.tempsLimiteS,
    essais: e.essais,
    critere: e.critere,
    position: e.position,
  }));
}

export async function categoriesDe(
  competitionId: string,
): Promise<CategorieVue[]> {
  const lignes = await db
    .select()
    .from(categorie)
    .where(eq(categorie.competitionId, competitionId))
    .orderBy(asc(categorie.position));
  return lignes.map((c, i) => ({
    id: c.id,
    nom: c.nom,
    poidsMin: c.poidsMin,
    poidsMax: c.poidsMax,
    active: c.active,
    position: c.position,
    couleur: c.couleur ?? couleurCategorie(i),
  }));
}

/**
 * Les athlètes, triés par dossard.
 *
 * Ce tri n'est pas cosmétique : le classement général s'appuie dessus pour
 * départager deux athlètes rigoureusement à égalité (même total, mêmes places
 * d'honneur). Le tri de `classementGeneral` étant stable, l'ordre des
 * dossards subsiste jusqu'au bout.
 */
export async function athletesDe(
  competitionId: string,
): Promise<AthletePublic[]> {
  const lignes = await db
    .select()
    .from(athlete)
    .where(eq(athlete.competitionId, competitionId))
    .orderBy(asc(athlete.dossard), asc(athlete.nom));
  return lignes.map((a) => ({
    id: a.id,
    nom: a.nom,
    prenoms: a.prenoms,
    club: a.club,
    pays: a.pays,
    dossard: a.dossard,
    poidsCorps: nombre(a.poidsCorps),
    categorieId: a.categorieId,
    horsClassement: a.horsClassement,
    peseeValidee: a.peseeValidee,
    photoUrl: a.photoUrl,
  }));
}

/* ── Résultats et classements ─────────────────────────────────────────── */

const versClassable = (a: AthletePublic): AthleteClassable => ({
  id: a.id,
  poidsCorps: a.poidsCorps,
  dossard: a.dossard,
  horsClassement: a.horsClassement,
});

/**
 * Tous les résultats exploitables de la compétition, en UNE requête.
 *
 * Indexés par épreuve, puis par athlète. Charger l'ensemble d'un coup peut
 * sembler excessif ; c'est en réalité le contraire. Interroger la base une
 * fois par épreuve et par catégorie multipliait les allers-retours — dix
 * requêtes en série pour un classement, soit plusieurs secondes de latence
 * cumulée sur un écran qui se rafraîchit toutes les deux secondes.
 *
 * Le volume reste dérisoire : quelques centaines de lignes pour une
 * compétition entière. Le calcul se fait ensuite en mémoire, instantanément.
 */
export type ResultatsParEpreuve = Map<string, Map<string, Resultat>>;

export async function tousLesResultats(
  competitionId: string,
  epreuves: EpreuveVue[],
): Promise<ResultatsParEpreuve> {
  const lignes = await db
    .select()
    .from(passage)
    .where(
      and(
        eq(passage.competitionId, competitionId),
        eq(passage.statut, "termine"),
      ),
    );

  const sens = new Map(epreuves.map((e) => [e.id, e.mesure === "chrono"]));
  const brut = new Map<string, Map<string, Resultat[]>>();

  for (const p of lignes) {
    // « zéro » et « forfait » ne sont pas des performances : ils closent le
    // passage sans valeur, et ne doivent pas concourir au meilleur essai.
    if (p.resultatStatut !== "ok" || p.valeur === null) continue;
    const parAthlete = brut.get(p.epreuveId) ?? new Map<string, Resultat[]>();
    const essais = parAthlete.get(p.athleteId) ?? [];
    essais.push({ statut: "ok", valeur: p.valeur, temps: p.tempsS });
    parAthlete.set(p.athleteId, essais);
    brut.set(p.epreuveId, parAthlete);
  }

  // Une épreuve peut compter plusieurs essais : on ne retient que le meilleur,
  // départagé selon le même critère que l'épreuve elle-même.
  const sortie: ResultatsParEpreuve = new Map();
  for (const [epreuveId, parAthlete] of brut) {
    const croissant = sens.get(epreuveId) ?? false;
    const retenus = new Map<string, Resultat>();
    for (const [athleteId, essais] of parAthlete) {
      retenus.set(
        athleteId,
        [...essais].sort((a, b) => {
          const av = a.valeur as number;
          const bv = b.valeur as number;
          if (av !== bv) return croissant ? av - bv : bv - av;
          return (a.temps ?? Infinity) - (b.temps ?? Infinity);
        })[0],
      );
    }
    sortie.set(epreuveId, retenus);
  }
  return sortie;
}

/** Les résultats d'une épreuve, sous la forme attendue par le barème. */
function pourEpreuve(
  resultats: ResultatsParEpreuve,
  epreuveId: string,
): Map<string, Resultat | null> {
  return (resultats.get(epreuveId) ?? new Map()) as Map<string, Resultat | null>;
}

export interface TableauEpreuve {
  epreuve: EpreuveVue;
  categorieId: string;
  lignes: LigneEpreuve[];
}

/**
 * Classement d'une épreuve dans une catégorie.
 *
 * Les résultats sont fournis par l'appelant — chargés une seule fois via
 * `tousLesResultats` — plutôt que requêtés ici : c'est ce qui évite de
 * multiplier les allers-retours vers la base à chaque affichage.
 */
export function tableauEpreuve(
  ep: EpreuveVue,
  categorieId: string,
  athletes: AthletePublic[],
  resultats: ResultatsParEpreuve,
): TableauEpreuve {
  const duGroupe = athletes.filter((a) => a.categorieId === categorieId);
  return {
    epreuve: ep,
    categorieId,
    lignes: classementEpreuve(
      duGroupe.map(versClassable),
      ep.mesure,
      pourEpreuve(resultats, ep.id),
    ),
  };
}

export interface TableauGeneral {
  categorie: CategorieVue;
  lignes: LigneGenerale[];
  /** Points par épreuve, pour la colonne détaillée du classement. */
  parEpreuve: Map<string, Map<string, number>>;
}

/**
 * Classement général d'une catégorie, toutes épreuves cumulées.
 *
 * Recalculé à chaque appel, jamais mis en cache : c'est la seule façon qu'une
 * disqualification se répercute immédiatement sur le mur LED.
 */
export function tableauGeneral(
  cat: CategorieVue,
  epreuves: EpreuveVue[],
  athletes: AthletePublic[],
  resultats: ResultatsParEpreuve,
): TableauGeneral {
  const duGroupe = athletes.filter((a) => a.categorieId === cat.id);
  const classables = duGroupe.map(versClassable);

  const tableaux: LigneEpreuve[][] = [];
  const parEpreuve = new Map<string, Map<string, number>>();
  for (const ep of epreuves) {
    const lignes = classementEpreuve(
      classables,
      ep.mesure,
      pourEpreuve(resultats, ep.id),
    );
    tableaux.push(lignes);
    parEpreuve.set(ep.id, new Map(lignes.map((l) => [l.athleteId, l.points])));
  }

  return {
    categorie: cat,
    lignes: classementGeneral(classables, tableaux),
    parEpreuve,
  };
}

/**
 * L'ordre dans lequel les athlètes d'une catégorie doivent passer.
 *
 * Première épreuve : dossards croissants. Ensuite, le moins de points passe
 * en premier — le leader ferme la marche.
 */
export function ordrePour(
  ep: EpreuveVue,
  categorieId: string,
  epreuves: EpreuveVue[],
  athletes: AthletePublic[],
  resultats: ResultatsParEpreuve,
): AthletePublic[] {
  const duGroupe = athletes.filter((a) => a.categorieId === categorieId);
  const index = epreuves.findIndex((e) => e.id === ep.id);

  const acquis = new Map<string, number>();
  if (index > 0) {
    const classables = duGroupe.map(versClassable);
    for (const precedente of epreuves.slice(0, index)) {
      for (const l of classementEpreuve(
        classables,
        precedente.mesure,
        pourEpreuve(resultats, precedente.id),
      )) {
        acquis.set(l.athleteId, (acquis.get(l.athleteId) ?? 0) + l.points);
      }
    }
  }

  const ordonnes = ordreDePassage(duGroupe.map(versClassable), index, acquis);
  const parId = new Map(duGroupe.map((a) => [a.id, a]));
  return ordonnes.map((c) => parId.get(c.id)!).filter(Boolean);
}

/* ── Plateau ──────────────────────────────────────────────────────────── */

export interface PassageVue {
  id: string;
  athleteId: string;
  ordre: number;
  /** `a_saisir` : passé au plateau, résultat attendu du jury. */
  statut: "avenir" | "plateau" | "a_saisir" | "termine";
  resultatStatut: "ok" | "zero" | "forfait" | null;
  valeur: number | null;
  tempsS: number | null;
  tours: number[] | null;
  /** Temps lu au chrono à l'arrêt, s'il a tourné. */
  chronoS: number | null;
  valideLe: Date | null;
}

/** Les passages d'une épreuve, pour une catégorie donnée. */
export async function passagesDe(
  epreuveId: string,
  athleteIds: string[],
): Promise<PassageVue[]> {
  if (athleteIds.length === 0) return [];
  const lignes = await db
    .select()
    .from(passage)
    .where(
      and(
        eq(passage.epreuveId, epreuveId),
        inArray(passage.athleteId, athleteIds),
      ),
    )
    .orderBy(asc(passage.ordre));
  return lignes.map((p) => ({
    id: p.id,
    athleteId: p.athleteId,
    ordre: p.ordre,
    statut: p.statut as PassageVue["statut"],
    resultatStatut: p.resultatStatut as PassageVue["resultatStatut"],
    valeur: p.valeur,
    tempsS: p.tempsS,
    tours: p.tours,
    chronoS: p.chronoS,
    valideLe: p.valideLe,
  }));
}

/* ── Lectures de préparation ──────────────────────────────────────────── */

/**
 * Les épreuves telles que la préparation les édite : la vue publique
 * (`EpreuveVue`) ne porte que ce dont les écrans ont besoin, la préparation a
 * besoin de tout.
 */
export type EpreuveComplete = typeof epreuve.$inferSelect;

export async function epreuvesCompletes(
  competitionId: string,
): Promise<EpreuveComplete[]> {
  return db
    .select()
    .from(epreuve)
    .where(eq(epreuve.competitionId, competitionId))
    .orderBy(asc(epreuve.position));
}

export async function officielsDe(competitionId: string) {
  return db
    .select()
    .from(officiel)
    .where(eq(officiel.competitionId, competitionId))
    .orderBy(asc(officiel.position));
}

export async function programmeDe(competitionId: string) {
  return db
    .select()
    .from(programme)
    .where(eq(programme.competitionId, competitionId))
    .orderBy(asc(programme.position));
}

export async function recompensesDe(competitionId: string) {
  return db
    .select()
    .from(recompense)
    .where(eq(recompense.competitionId, competitionId))
    .orderBy(asc(recompense.rang));
}

export async function sortiesDe(competitionId: string) {
  return db
    .select()
    .from(sortie)
    .where(eq(sortie.competitionId, competitionId))
    .orderBy(asc(sortie.position));
}

/** Les logos de clubs, indexés par nom de club exactement tel que saisi. */
export async function logosDe(
  competitionId: string,
): Promise<Map<string, string>> {
  const lignes = await db
    .select()
    .from(clubLogo)
    .where(eq(clubLogo.competitionId, competitionId));
  const m = new Map<string, string>();
  for (const l of lignes) if (l.logoUrl) m.set(l.club, l.logoUrl);
  return m;
}

/**
 * La fiche complète d'un athlète, contact compris.
 *
 * Réservée à l'administration : c'est la seule lecture qui joigne
 * `athleteContact`, et elle ne doit jamais être appelée depuis `/ecran`.
 * Le cloisonnement décrit en tête de `schema.ts` tient à cette discipline.
 */
export interface FicheAthlete extends AthletePublic {
  poidsDeclare: number | null;
  tailleCm: number | null;
  /** `AAAA-MM-JJ`, ou `null`. Donnée personnelle : jamais dans la vue publique. */
  dateNaissance: string | null;
  /** Calculé au jour de la compétition, jamais stocké. */
  age: number | null;
  note: string | null;
  niveaux: Record<string, string>;
  aVerifier: boolean;
  telephone: string | null;
  contactUrgence: string | null;
  commune: string | null;
}

export async function fichesAthletes(
  competitionId: string,
): Promise<FicheAthlete[]> {
  // L'âge se compte au jour de la compétition : c'est la règle sportive, et
  // une fiche ne doit pas changer d'âge entre la pesée et le podium.
  const [comp] = await db
    .select({ debutLe: competition.debutLe })
    .from(competition)
    .where(eq(competition.id, competitionId));
  const jourJ = comp?.debutLe ?? null;

  const lignes = await db
    .select()
    .from(athlete)
    .leftJoin(athleteContact, eq(athleteContact.athleteId, athlete.id))
    .where(eq(athlete.competitionId, competitionId))
    .orderBy(asc(athlete.dossard), asc(athlete.nom));

  return lignes.map(({ athlete: a, athlete_contact: c }) => {
    let niveaux: Record<string, string> = {};
    try {
      niveaux = a.niveaux ? JSON.parse(a.niveaux) : {};
    } catch {
      // Une colonne JSON illisible ne doit pas faire tomber la liste des
      // engagés : on repart d'un niveau vide, la table le ressaisira.
      niveaux = {};
    }
    return {
      id: a.id,
      nom: a.nom,
      prenoms: a.prenoms,
      club: a.club,
      pays: a.pays,
      dossard: a.dossard,
      poidsCorps: nombre(a.poidsCorps),
      categorieId: a.categorieId,
      horsClassement: a.horsClassement,
      peseeValidee: a.peseeValidee,
      photoUrl: a.photoUrl,
      poidsDeclare: nombre(a.poidsDeclare),
      tailleCm: a.tailleCm,
      dateNaissance: c?.dateNaissance ?? null,
      age: ageDe(c?.dateNaissance ?? null, jourJ),
      note: a.note,
      niveaux,
      aVerifier: a.aVerifier,
      telephone: c?.telephone ?? null,
      contactUrgence: c?.contactUrgence ?? null,
      commune: c?.commune ?? null,
    };
  });
}

/**
 * Les niveaux déclarés pour une épreuve, indexés par athlète.
 *
 * Lecture à part plutôt qu'un champ de plus dans `AthletePublic` : le niveau
 * n'intéresse que le plateau et le mur LED d'une épreuve à niveaux, et la vue
 * publique reste ainsi ce qu'elle promet — le strict nécessaire aux écrans.
 */
export async function niveauxPour(
  competitionId: string,
  epreuveId: string,
): Promise<Record<string, string>> {
  const lignes = await db
    .select({ id: athlete.id, niveaux: athlete.niveaux })
    .from(athlete)
    .where(eq(athlete.competitionId, competitionId));

  const m: Record<string, string> = {};
  for (const l of lignes) {
    if (!l.niveaux) continue;
    try {
      const n = JSON.parse(l.niveaux)[epreuveId];
      if (n) m[l.id] = n;
    } catch {
      // Colonne illisible : l'athlète passe sans niveau affiché plutôt que
      // de faire tomber tout le plateau.
    }
  }
  return m;
}

/* ── Signature de fraîcheur des écrans publics ────────────────────────── */

/**
 * Une empreinte courte de tout ce qui change l'affichage du mur LED.
 *
 * Elle existe pour une seule raison : un écran public se rafraîchit toutes les
 * deux secondes, et refaire le rendu complet de la page à chaque fois revient
 * à recalculer des classements identiques des heures durant. L'écran demande
 * d'abord cette empreinte — une requête, quelques octets — et ne redemande la
 * page que si elle a bougé.
 *
 * Ce qu'elle couvre : l'épreuve et la catégorie courantes, la suspension, le
 * thème, l'état du chronomètre, et surtout **qui est au plateau** — le signal
 * qui doit passer en moins de deux secondes. Les retouches plus rares (un nom
 * corrigé, une photo déposée) n'y figurent pas : l'écran les rattrape par le
 * rafraîchissement complet périodique décrit dans `rafraichir.tsx`.
 */
export async function signatureEcrans(
  /** Par défaut, la compétition courante. Renseigné par les tests. */
  competitionId?: string,
): Promise<string> {
  // Chaque champ est ramené à un texte non nul : `concat_ws` SAUTE les NULL,
  // si bien que « épreuve choisie, catégorie nulle » et « épreuve nulle,
  // catégorie choisie » rendraient la même chaîne. Un tiret garde la position.
  const t = (x: unknown) => sql`coalesce(${x}::text, '-')`;

  const [ligne] = await db.execute<{ signature: string }>(sql`
    select concat_ws('|',
      ${t(sql`c.maj_le`)}, ${t(sql`c.epreuve_courante_id`)},
      ${t(sql`c.categorie_courante_id`)}, ${t(sql`c.suspendue`)},
      ${t(sql`c.motif_suspension`)}, ${t(sql`c.theme_ecran`)},
      ${t(sql`c.chrono_phase`)}, ${t(sql`c.chrono_debut_le`)},
      ${t(sql`c.chrono_duree_s`)}, ${t(sql`c.chrono_arret_s`)},
      ${t(sql`(select count(*) from passage p where p.competition_id = c.id)`)},
      ${t(sql`(select max(p.valide_le) from passage p where p.competition_id = c.id)`)},
      ${t(sql`(select string_agg(p.id::text, ',' order by p.id)
                 from passage p
                where p.competition_id = c.id and p.statut = 'plateau')`)},
      ${t(sql`(select string_agg(p.id::text, ',' order by p.ordre)
                 from passage p
                where p.competition_id = c.id and p.statut = 'avenir')`)}
    ) as signature
    from competition c
    ${
      competitionId
        ? sql`where c.id = ${competitionId}`
        : sql`order by c.cree_le asc limit 1`
    }
  `);
  return ligne?.signature ?? "";
}
