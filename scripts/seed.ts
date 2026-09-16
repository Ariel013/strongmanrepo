/**
 * Installe la compétition du 19 septembre 2026 : épreuves, catégories, jury.
 *
 *   pnpm run db:seed
 *
 * Les cinq épreuves et leurs critères sont repris tels quels du logiciel
 * d'arbitrage d'origine — ce sont les épreuves officielles FIBDA, pas des
 * exemples. Le script est idempotent : relancé, il ne crée pas de doublon.
 */

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  categorie,
  competition,
  epreuve,
  officiel,
  programme,
  recompense,
  sortie,
} from "../src/lib/db/schema";

const NOM_COMPETITION = "Championnat National de Strongman 2026";

/** Les cinq épreuves officielles, dans l'ordre du programme. */
const EPREUVES = [
  {
    nom: "Atlas Stones",
    mesure: "nb_temps",
    tempsLimiteS: 60,
    essais: 1,
    critere:
      "Nombre de pierres validées dans le temps imparti ; à égalité, le temps intermédiaire de la dernière pierre chargée",
    materiel: "4 boules (2 de 120 kg, 2 de 90 kg), 4 barrières métalliques",
    equipements: "Genouillères, ceinture de force",
    tours: true,
  },
  {
    nom: "Renversement de pneu",
    mesure: "nb_temps",
    tempsLimiteS: 60,
    essais: 1,
    critere:
      "Nombre de renversements réussis dans le temps imparti ; à égalité, le temps intermédiaire du dernier renversement",
    materiel: "2 pneus (300 kg et 200 kg)",
    equipements: "Ceinture de force, genouillères, gants ou magnésie",
    tours: true,
  },
  {
    nom: "Deadlift voiture",
    mesure: "nb_temps",
    tempsLimiteS: 60,
    essais: 3,
    critere:
      "Nombre de levées validées avec verrouillage (maintien 2 secondes minimum) ; à égalité, le temps intermédiaire de la dernière levée",
    materiel: "2 voitures, cadre métallique à pivot",
    equipements: "Sangles de tirage, magnésie",
    tours: true,
  },
  {
    nom: "Piliers d'Hercule",
    mesure: "duree",
    tempsLimiteS: null, // illimité : l'épreuve dure tant que l'athlète tient
    essais: 1,
    critere: "Temps de maintien en isométrie (le plus long temps l'emporte)",
    materiel: "2 piliers métalliques de 150 kg chacun",
    equipements:
      "Magnésie, ceinture de force, genouillères et coudières, chaussures plates rigides",
    tours: true,
    // Épreuve de tenue : la hauteur de prise dépend de la taille de
    // l'athlète, qui déclare donc son niveau sur sa fiche.
    niveau: true,
    niveauxOptions:
      "Niveau 1 — prise basse, Niveau 2 — prise médiane, Niveau 3 — prise haute",
  },
  {
    nom: "Tirage de camion",
    mesure: "distance",
    tempsLimiteS: 90,
    essais: 1,
    critere:
      "Distance parcourue dans le temps imparti, mesurée de la ligne de départ à la marque du pneu avant ; à distance égale, le temps le plus rapide",
    materiel: "1 camion, 1 corde de stabilisation, 1 harnais",
    equipements: "Chaussures à forte traction, manchons, ceinture de force",
    tours: false,
  },
] as const;

/**
 * Bornes : `poidsMin < poids <= poidsMax`. La borne haute est inclusive, la
 * basse exclusive — 105,0 kg tombe donc dans « moins de 105 kg » et dans elle
 * seule. Aucun recouvrement possible.
 */
const CATEGORIES = [
  { nom: "Moins de 105 kg", poidsMin: null, poidsMax: 105, position: 0 },
  { nom: "Plus de 105 kg", poidsMin: 105, poidsMax: null, position: 1 },
];

/** Jury type : les noms se saisissent depuis l'interface. */
const OFFICIELS = [
  { role: "directeur", position: 0 },
  { role: "arbitrage", position: 1 },
  { role: "juge", position: 2 },
  { role: "juge", position: 3 },
  { role: "juge", position: 4 },
  { role: "chrono", position: 5 },
  { role: "secretaire", position: 6 },
  { role: "regie", position: 7 },
];

/** Le déroulé type de la journée, repris du poste d'origine. */
const PROGRAMME = [
  { heure: "14h00", texte: "Accueil des athlètes, pesée, vérification des équipements" },
  { heure: "15h30", texte: "Briefing technique, présentation des épreuves, rappel des consignes" },
  { heure: "16h30", texte: "Démarrage des épreuves" },
  { heure: "22h30", texte: "Fin des épreuves, délibérations, proclamation des résultats" },
  { heure: "22h45", texte: "Remise des récompenses, photo officielle, clôture" },
];

/** Les trois médailles et primes officielles. */
const RECOMPENSES = [
  { rang: 1, titre: "Médaille d'or", prime: "500 000 fr", lot: "Trophée du champion" },
  { rang: 2, titre: "Médaille d'argent", prime: "300 000 fr", lot: "" },
  { rang: 3, titre: "Médaille de bronze", prime: "200 000 fr", lot: "" },
];

/** Deux sorties vidéo par défaut, comme sur le poste d'origine. */
const SORTIES = [
  { nom: "Mur LED principal", contenu: "plateau", position: 0 },
  { nom: "Écran secondaire", contenu: "ordre", position: 1 },
];

/**
 * Complète une compétition existante.
 *
 * Le programme, les récompenses et les sorties de régie sont arrivés après la
 * première installation : une compétition déjà en base ne les a pas. On les
 * ajoute seulement s'ils manquent — jamais en écrasant ce que la table a pu
 * saisir entre-temps.
 */
async function completer(competitionId: string) {
  const ajouts: string[] = [];

  const dejaProgramme = await db
    .select()
    .from(programme)
    .where(eq(programme.competitionId, competitionId))
    .limit(1);
  if (dejaProgramme.length === 0) {
    await db.insert(programme).values(
      PROGRAMME.map((p, i) => ({ ...p, competitionId, position: i })),
    );
    ajouts.push(`${PROGRAMME.length} lignes de programme`);
  }

  const dejaRecompenses = await db
    .select()
    .from(recompense)
    .where(eq(recompense.competitionId, competitionId))
    .limit(1);
  if (dejaRecompenses.length === 0) {
    await db
      .insert(recompense)
      .values(RECOMPENSES.map((r) => ({ ...r, competitionId })));
    ajouts.push(`${RECOMPENSES.length} récompenses`);
  }

  const dejaSorties = await db
    .select()
    .from(sortie)
    .where(eq(sortie.competitionId, competitionId))
    .limit(1);
  if (dejaSorties.length === 0) {
    await db
      .insert(sortie)
      .values(SORTIES.map((s) => ({ ...s, competitionId })));
    ajouts.push(`${SORTIES.length} sorties de régie`);
  }

  return ajouts;
}

async function principal() {
  const existante = await db
    .select()
    .from(competition)
    .where(eq(competition.nom, NOM_COMPETITION))
    .limit(1);

  if (existante.length > 0) {
    console.log(
      `La compétition « ${NOM_COMPETITION} » existe déjà — rien n'a été recréé.`,
    );
    const ajouts = await completer(existante[0].id);
    if (ajouts.length > 0) console.log(`  Complétée : ${ajouts.join(", ")}.`);
    else console.log("  Rien à compléter.");
    return;
  }

  const [comp] = await db
    .insert(competition)
    .values({
      nom: NOM_COMPETITION,
      lieu: "Espace pétanque Sococé",
      adresse: "Deux Plateaux, boulevard Latrille, Abidjan",
      debutLe: new Date("2026-09-19T14:00:00+00:00"),
      finLe: new Date("2026-09-19T23:00:00+00:00"),
    })
    .returning();

  await db.insert(categorie).values(
    CATEGORIES.map((c) => ({ ...c, competitionId: comp.id })),
  );

  await db.insert(epreuve).values(
    EPREUVES.map((e, i) => ({
      competitionId: comp.id,
      nom: e.nom,
      mesure: e.mesure,
      tempsLimiteS: e.tempsLimiteS,
      essais: e.essais,
      critere: e.critere,
      materiel: e.materiel,
      equipements: e.equipements,
      tours: e.tours,
      niveau: "niveau" in e ? e.niveau : false,
      niveauxOptions: "niveauxOptions" in e ? e.niveauxOptions : null,
      position: i,
    })),
  );

  await db.insert(officiel).values(
    OFFICIELS.map((o) => ({ ...o, nom: "", competitionId: comp.id })),
  );

  await completer(comp.id);

  console.log(`✓ Compétition « ${comp.nom} » créée.`);
  console.log(`  ${CATEGORIES.length} catégories, ${EPREUVES.length} épreuves,`);
  console.log(`  ${OFFICIELS.length} postes d'officiels à nommer,`);
  console.log(
    `  ${PROGRAMME.length} lignes de programme, ${RECOMPENSES.length} récompenses, ${SORTIES.length} sorties de régie.`,
  );
}

principal()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Installation interrompue :", e.message);
    process.exit(1);
  });
