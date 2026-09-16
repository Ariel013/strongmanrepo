/**
 * Lectures de la base — la seule porte d'entrée des écrans vers les données.
 *
 * Aucun composant ne fait de requête lui-même : tout passe ici. C'est ce qui
 * permet de garantir, en un seul endroit, que les écrans publics ne reçoivent
 * jamais un téléphone ni un contact d'urgence.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { athlete, categorie, competition, epreuve, passage } from "./db/schema";
import {
  classementEpreuve,
  classementGeneral,
  ordreDePassage,
  type AthleteClassable,
  type LigneEpreuve,
  type LigneGenerale,
  type Mesure,
  type Resultat,
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
    mesure: e.mesure as Mesure,
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
  return lignes.map((c) => ({
    id: c.id,
    nom: c.nom,
    poidsMin: c.poidsMin,
    poidsMax: c.poidsMax,
    active: c.active,
    position: c.position,
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
 * Le meilleur résultat de chaque athlète sur une épreuve.
 *
 * Une épreuve peut compter plusieurs essais : on ne garde que le meilleur,
 * départagé comme l'épreuve elle-même. Les passages « zéro » et « forfait »
 * sont écartés — ce ne sont pas des performances.
 */
async function meilleursResultats(
  epreuveId: string,
  mesure: Mesure,
): Promise<Map<string, Resultat | null>> {
  const lignes = await db
    .select()
    .from(passage)
    .where(and(eq(passage.epreuveId, epreuveId), eq(passage.statut, "termine")));

  const parAthlete = new Map<string, Resultat[]>();
  for (const p of lignes) {
    if (p.resultatStatut !== "ok" || p.valeur === null) continue;
    const liste = parAthlete.get(p.athleteId) ?? [];
    liste.push({
      statut: "ok",
      valeur: p.valeur,
      temps: p.tempsS,
    });
    parAthlete.set(p.athleteId, liste);
  }

  const asc_ = mesure === "chrono";
  const sortie = new Map<string, Resultat | null>();
  for (const [id, liste] of parAthlete) {
    const meilleur = [...liste].sort((a, b) => {
      const av = a.valeur as number;
      const bv = b.valeur as number;
      if (av !== bv) return asc_ ? av - bv : bv - av;
      const at = a.temps ?? Infinity;
      const bt = b.temps ?? Infinity;
      return at - bt;
    })[0];
    sortie.set(id, meilleur);
  }
  return sortie;
}

export interface TableauEpreuve {
  epreuve: EpreuveVue;
  categorieId: string;
  lignes: LigneEpreuve[];
}

/** Classement d'une épreuve dans une catégorie. */
export async function tableauEpreuve(
  ep: EpreuveVue,
  categorieId: string,
  athletes: AthletePublic[],
): Promise<TableauEpreuve> {
  const duGroupe = athletes.filter((a) => a.categorieId === categorieId);
  const resultats = await meilleursResultats(ep.id, ep.mesure);
  return {
    epreuve: ep,
    categorieId,
    lignes: classementEpreuve(
      duGroupe.map(versClassable),
      ep.mesure,
      resultats,
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
export async function tableauGeneral(
  cat: CategorieVue,
  epreuves: EpreuveVue[],
  athletes: AthletePublic[],
): Promise<TableauGeneral> {
  const duGroupe = athletes.filter((a) => a.categorieId === cat.id);
  const classables = duGroupe.map(versClassable);

  const tableaux: LigneEpreuve[][] = [];
  const parEpreuve = new Map<string, Map<string, number>>();
  for (const ep of epreuves) {
    const resultats = await meilleursResultats(ep.id, ep.mesure);
    const lignes = classementEpreuve(classables, ep.mesure, resultats);
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
export async function ordrePour(
  ep: EpreuveVue,
  categorieId: string,
  epreuves: EpreuveVue[],
  athletes: AthletePublic[],
): Promise<AthletePublic[]> {
  const duGroupe = athletes.filter((a) => a.categorieId === categorieId);
  const index = epreuves.findIndex((e) => e.id === ep.id);

  const acquis = new Map<string, number>();
  if (index > 0) {
    const classables = duGroupe.map(versClassable);
    for (const precedente of epreuves.slice(0, index)) {
      const resultats = await meilleursResultats(precedente.id, precedente.mesure);
      for (const l of classementEpreuve(classables, precedente.mesure, resultats)) {
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
  statut: "avenir" | "plateau" | "termine";
  resultatStatut: "ok" | "zero" | "forfait" | null;
  valeur: number | null;
  tempsS: number | null;
  tours: number[] | null;
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
    valideLe: p.valideLe,
  }));
}
