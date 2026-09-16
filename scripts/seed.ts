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
import { categorie, competition, epreuve, officiel } from "../src/lib/db/schema";

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

async function principal() {
  const existante = await db
    .select()
    .from(competition)
    .where(eq(competition.nom, NOM_COMPETITION))
    .limit(1);

  if (existante.length > 0) {
    console.log(
      `La compétition « ${NOM_COMPETITION} » existe déjà — rien n'a été créé.`,
    );
    console.log(
      "  Pour repartir de zéro, supprimez-la depuis l'administration.",
    );
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
      position: i,
    })),
  );

  await db.insert(officiel).values(
    OFFICIELS.map((o) => ({ ...o, nom: "", competitionId: comp.id })),
  );

  console.log(`✓ Compétition « ${comp.nom} » créée.`);
  console.log(`  ${CATEGORIES.length} catégories, ${EPREUVES.length} épreuves,`);
  console.log(`  ${OFFICIELS.length} postes d'officiels à nommer.`);
}

principal()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Installation interrompue :", e.message);
    process.exit(1);
  });
