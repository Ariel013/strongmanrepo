/**
 * Tests fonctionnels — le barème et le déroulé d'une compétition.
 *
 *   pnpm run test
 *
 * Ce que ce script vérifie n'est pas l'affichage mais la RÈGLE : le barème,
 * les départages, l'ordre de passage, le traitement du zéro et du forfait.
 * C'est ce qui décide du podium, et c'est ce qu'une réclamation vient
 * contester — le reste se voit à l'œil, pas ça.
 *
 * Il travaille sur une compétition JETABLE, créée puis supprimée : jamais sur
 * la compétition réelle. La suppression en cascade emporte ses athlètes, ses
 * épreuves et ses passages.
 */

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  athlete,
  categorie,
  competition,
  epreuve,
  passage,
} from "../src/lib/db/schema";
import {
  athletesDe,
  categoriesDe,
  epreuvesDe,
  ordrePour,
  tableauEpreuve,
  tableauGeneral,
  tousLesResultats,
} from "../src/lib/donnees";
import { classementEpreuve, plusPetitGagne } from "../src/lib/classement";
import { cleRapprochement, lireListe } from "../src/lib/import-liste";

const NOM_TEST = "ZZZ — compétition de test automatique";

let reussis = 0;
const echecs: string[] = [];

function verifier(intitule: string, condition: boolean, detail?: string) {
  if (condition) {
    reussis++;
    console.log(`  ✓ ${intitule}`);
  } else {
    echecs.push(intitule + (detail ? ` — ${detail}` : ""));
    console.log(`  ✗ ${intitule}${detail ? ` — ${detail}` : ""}`);
  }
}

function egal(intitule: string, obtenu: unknown, attendu: unknown) {
  const a = JSON.stringify(obtenu);
  const b = JSON.stringify(attendu);
  verifier(intitule, a === b, a === b ? undefined : `obtenu ${a}, attendu ${b}`);
}

/* ── Mise en place ────────────────────────────────────────────────────── */

async function nettoyer() {
  const anciennes = await db
    .select()
    .from(competition)
    .where(eq(competition.nom, NOM_TEST));
  for (const c of anciennes)
    await db.delete(competition).where(eq(competition.id, c.id));
}

async function installer() {
  const [comp] = await db
    .insert(competition)
    .values({ nom: NOM_TEST, lieu: "Test" })
    .returning();

  const cats = await db
    .insert(categorie)
    .values([
      { competitionId: comp.id, nom: "Moins de 100", poidsMax: 100, position: 0 },
      { competitionId: comp.id, nom: "Plus de 100", poidsMin: 100, position: 1 },
    ])
    .returning();

  const eps = await db
    .insert(epreuve)
    .values([
      {
        competitionId: comp.id,
        nom: "Pneu",
        mesure: "nb_temps",
        tempsLimiteS: 60,
        position: 0,
      },
      {
        competitionId: comp.id,
        nom: "Sprint",
        mesure: "chrono",
        tempsLimiteS: 60,
        position: 1,
      },
    ])
    .returning();

  // Quatre athlètes dans la première catégorie, deux dans la seconde.
  const ath = await db
    .insert(athlete)
    .values([
      { competitionId: comp.id, nom: "ALPHA", prenoms: "A", dossard: 1, poidsCorps: "90.0", categorieId: cats[0].id },
      { competitionId: comp.id, nom: "BRAVO", prenoms: "B", dossard: 2, poidsCorps: "95.0", categorieId: cats[0].id },
      { competitionId: comp.id, nom: "CHARLIE", prenoms: "C", dossard: 3, poidsCorps: "80.0", categorieId: cats[0].id },
      { competitionId: comp.id, nom: "DELTA", prenoms: "D", dossard: 4, poidsCorps: "99.0", categorieId: cats[0].id },
      { competitionId: comp.id, nom: "ECHO", prenoms: "E", dossard: 5, poidsCorps: "120.0", categorieId: cats[1].id },
      { competitionId: comp.id, nom: "FOXTROT", prenoms: "F", dossard: 6, poidsCorps: "130.0", categorieId: cats[1].id, horsClassement: true },
    ])
    .returning();

  return { comp, cats, eps, ath };
}

/* ── Scénario ─────────────────────────────────────────────────────────── */

async function principal() {
  console.log("\nInstallation d'une compétition jetable…");
  await nettoyer();
  const { comp, cats, eps, ath } = await installer();
  const [alpha, bravo, charlie, delta, echo, foxtrot] = ath;

  try {
    /* ── 1. Sens du classement ── */
    console.log("\n1. Sens du classement selon la mesure");
    verifier("« chrono » se classe à l'envers", plusPetitGagne("chrono"));
    verifier("« nb_temps » se classe à l'endroit", !plusPetitGagne("nb_temps"));
    verifier("« poids » se classe à l'endroit", !plusPetitGagne("poids"));
    verifier("« distance » se classe à l'endroit", !plusPetitGagne("distance"));

    /* ── 2. Barème Points = N − rang + 1 ── */
    console.log("\n2. Barème : Points = N − rang + 1");
    const classables = [alpha, bravo, charlie, delta].map((a) => ({
      id: a.id,
      poidsCorps: Number(a.poidsCorps),
      dossard: a.dossard,
      horsClassement: a.horsClassement,
    }));
    const lignes = classementEpreuve(
      classables,
      "nb_temps",
      new Map([
        [alpha.id, { statut: "ok" as const, valeur: 5, temps: 40 }],
        [bravo.id, { statut: "ok" as const, valeur: 3, temps: null }],
        [charlie.id, { statut: "ok" as const, valeur: 1, temps: null }],
        [delta.id, { statut: "ok" as const, valeur: 0, temps: null }],
      ]),
    );
    const parId = new Map(lignes.map((l) => [l.athleteId, l]));
    egal("le premier de quatre marque 4 points", parId.get(alpha.id)?.points, 4);
    egal("le deuxième marque 3 points", parId.get(bravo.id)?.points, 3);
    egal("le dernier marque 1 point", parId.get(delta.id)?.points, 1);

    /* ── 3. Ex æquo : mêmes points, rang suivant sauté ── */
    console.log("\n3. Ex æquo");
    const exaequo = classementEpreuve(
      classables,
      "poids",
      new Map([
        [alpha.id, { statut: "ok" as const, valeur: 100, temps: null }],
        // Même charge ET même poids de corps que personne d'autre : seul le
        // poids de corps peut les départager, on le neutralise en visant deux
        // athlètes dont on connaît l'écart.
        [bravo.id, { statut: "ok" as const, valeur: 100, temps: null }],
        [charlie.id, { statut: "ok" as const, valeur: 50, temps: null }],
        [delta.id, { statut: "ok" as const, valeur: 25, temps: null }],
      ]),
    );
    const ex = new Map(exaequo.map((l) => [l.athleteId, l]));
    // Charlie (80 kg) est plus léger que Bravo (95) : à charge égale le plus
    // léger passe devant. Ici Alpha (90) et Bravo (95) sont à égalité de
    // charge — le départage au poids de corps doit trancher, pas un hasard.
    egal("à charge égale, le plus léger devance", ex.get(alpha.id)?.rang, 1);
    egal("le plus lourd suit immédiatement", ex.get(bravo.id)?.rang, 2);
    verifier(
      "les rangs restent strictement croissants",
      exaequo.every((l, i) => i === 0 || l.rang! >= exaequo[i - 1].rang!),
    );

    /* ── 4. Zéro et forfait ── */
    console.log("\n4. Zéro et forfait");
    const avecNuls = classementEpreuve(
      classables,
      "nb_temps",
      new Map([
        [alpha.id, { statut: "ok" as const, valeur: 5, temps: null }],
        [bravo.id, { statut: "zero" as const, valeur: null, temps: null }],
        [charlie.id, { statut: "forfait" as const, valeur: null, temps: null }],
        [delta.id, { statut: "ok" as const, valeur: 2, temps: null }],
      ]),
    );
    const nuls = new Map(avecNuls.map((l) => [l.athleteId, l]));
    egal("un zéro vaut 0 point", nuls.get(bravo.id)?.points, 0);
    egal("un forfait vaut 0 point", nuls.get(charlie.id)?.points, 0);
    egal(
      "l'effectif classable reste celui du groupe entier",
      nuls.get(alpha.id)?.points,
      4,
    );

    /* ── 5. Hors classement ── */
    console.log("\n5. Invité, hors classement");
    const avecInvite = classementEpreuve(
      [echo, foxtrot].map((a) => ({
        id: a.id,
        poidsCorps: Number(a.poidsCorps),
        dossard: a.dossard,
        horsClassement: a.horsClassement,
      })),
      "nb_temps",
      new Map([
        [echo.id, { statut: "ok" as const, valeur: 3, temps: null }],
        [foxtrot.id, { statut: "ok" as const, valeur: 9, temps: null }],
      ]),
    );
    const inv = new Map(avecInvite.map((l) => [l.athleteId, l]));
    // Le poste d'origine écarte l'invité du tableau dès le départ
    // (`filter(a => !horsClassement(a))`), il n'y figure pas même sans rang.
    // Le portage fait pareil : c'est ce que ce test verrouille.
    verifier(
      "l'invité ne figure pas au tableau, malgré la meilleure performance",
      inv.get(foxtrot.id) === undefined,
      `obtenu ${JSON.stringify(inv.get(foxtrot.id))}`,
    );
    egal("le seul classé est premier", inv.get(echo.id)?.rang, 1);
    egal("et marque 1 point (N = 1)", inv.get(echo.id)?.points, 1);

    /* ── 6. Résultats lus depuis la base ── */
    console.log("\n6. Lecture des résultats en base");
    await db.insert(passage).values([
      { competitionId: comp.id, epreuveId: eps[0].id, athleteId: alpha.id, ordre: 1, statut: "termine", resultatStatut: "ok", valeur: 5, tempsS: 40, valideLe: new Date() },
      { competitionId: comp.id, epreuveId: eps[0].id, athleteId: bravo.id, ordre: 2, statut: "termine", resultatStatut: "ok", valeur: 3, valideLe: new Date() },
      { competitionId: comp.id, epreuveId: eps[0].id, athleteId: charlie.id, ordre: 3, statut: "termine", resultatStatut: "zero", valideLe: new Date() },
      { competitionId: comp.id, epreuveId: eps[0].id, athleteId: delta.id, ordre: 4, statut: "avenir" },
      // Deux essais pour Alpha sur le sprint : le meilleur (le plus court) doit gagner.
      { competitionId: comp.id, epreuveId: eps[1].id, athleteId: alpha.id, ordre: 1, statut: "termine", resultatStatut: "ok", valeur: 12.4, valideLe: new Date() },
      { competitionId: comp.id, epreuveId: eps[1].id, athleteId: alpha.id, ordre: 2, statut: "termine", resultatStatut: "ok", valeur: 11.1, valideLe: new Date() },
      { competitionId: comp.id, epreuveId: eps[1].id, athleteId: bravo.id, ordre: 3, statut: "termine", resultatStatut: "ok", valeur: 13.0, valideLe: new Date() },
    ]);

    const epreuvesVue = await epreuvesDe(comp.id);
    const catsVue = await categoriesDe(comp.id);
    const athVue = await athletesDe(comp.id);
    const resultats = await tousLesResultats(comp.id, epreuvesVue);

    const sprint = resultats.get(eps[1].id)!;
    egal(
      "sur plusieurs essais, le meilleur chrono est retenu",
      sprint.get(alpha.id)?.valeur,
      11.1,
    );
    verifier(
      "un « zéro » n'entre pas dans les résultats exploitables",
      !resultats.get(eps[0].id)?.has(charlie.id),
    );
    verifier(
      "un passage non terminé n'entre pas dans les résultats",
      !resultats.get(eps[0].id)?.has(delta.id),
    );

    /* ── 7. Classements assemblés ── */
    console.log("\n7. Classements d'épreuve et général");
    const tPneu = tableauEpreuve(epreuvesVue[0], cats[0].id, athVue, resultats);
    const pneu = new Map(tPneu.lignes.map((l) => [l.athleteId, l]));
    egal("Alpha premier au pneu", pneu.get(alpha.id)?.rang, 1);
    egal("… et marque 4 points sur un groupe de 4", pneu.get(alpha.id)?.points, 4);
    egal("Charlie (zéro) reste classé sans rang", pneu.get(charlie.id)?.rang, null);

    const general = tableauGeneral(
      catsVue[0],
      epreuvesVue,
      athVue,
      resultats,
    );
    const gen = new Map(general.lignes.map((l) => [l.athleteId, l]));
    egal(
      "le total d'Alpha cumule ses deux épreuves",
      gen.get(alpha.id)?.total,
      (pneu.get(alpha.id)?.points ?? 0) +
        (general.parEpreuve.get(eps[1].id)?.get(alpha.id) ?? 0),
    );
    verifier(
      "tous les athlètes classables figurent au général",
      general.lignes.length === 4,
      `${general.lignes.length} lignes`,
    );

    /* ── 8. Ordre de passage ── */
    console.log("\n8. Ordre de passage");
    const ordre1 = ordrePour(
      epreuvesVue[0],
      cats[0].id,
      epreuvesVue,
      athVue,
      resultats,
    );
    egal(
      "première épreuve : dossards croissants",
      ordre1.map((a) => a.dossard),
      [1, 2, 3, 4],
    );

    const ordre2 = ordrePour(
      epreuvesVue[1],
      cats[0].id,
      epreuvesVue,
      athVue,
      resultats,
    );
    const pointsPneu = general.parEpreuve.get(eps[0].id)!;
    const croissant = ordre2.every(
      (a, i) =>
        i === 0 ||
        (pointsPneu.get(a.id) ?? 0) >= (pointsPneu.get(ordre2[i - 1].id) ?? 0),
    );
    verifier(
      "épreuve suivante : du moins de points au plus de points",
      croissant,
      ordre2.map((a) => `${a.dossard}:${pointsPneu.get(a.id)}`).join(" "),
    );
    egal(
      "le leader ferme la marche",
      ordre2[ordre2.length - 1].id === alpha.id,
      true,
    );

    /* ── 9. Lecture d'une liste d'engagés ── */
    console.log("\n9. Import : lecture d'une liste");

    const csv = lireListe(
      "Nom;Prénoms;Club;Poids;Téléphone\n" +
        "KONÉ;Ibrahim;Iron Club;118;07 00 00 00 00\n" +
        "YAO;Serge;Force Yopougon;95;05 11 11 11 11",
    );
    egal("CSV : deux lignes", csv.length, 2);
    egal("CSV : nom", csv[0].nom, "KONÉ");
    egal("CSV : prénoms", csv[0].prenoms, "Ibrahim");
    egal("CSV : club", csv[0].club, "Iron Club");
    egal("CSV : poids", csv[0].poids, "118");
    verifier("CSV : téléphone lu", csv[0].telephone.includes("07"));
    egal("CSV nommé : aucun doute signalé", csv[0].motifs.length, 0);

    const tab = lireListe("KONÉ\tIbrahim\tIron Club\t118");
    verifier(
      "colonnes non nommées : l'ordre supposé est signalé",
      tab[0].motifs.some((m) => m.includes("ordre du modèle")),
      tab[0].motifs.join(", "),
    );

    const libre = lireListe(
      "KONÉ Ibrahim — Iron Club Abidjan — 118 kg — 07 00 00 00 00\n" +
        "YAO Serge Aristide — Force Yopougon — 95 kg",
    );
    egal("texte libre : deux lignes", libre.length, 2);
    egal("texte libre : nom en capitales reconnu", libre[0].nom, "KONÉ");
    egal("texte libre : prénoms composés", libre[1].prenoms, "Serge Aristide");
    egal("texte libre : poids lu", libre[0].poids, "118");
    verifier("texte libre : téléphone extrait", libre[0].telephone.includes("07"));
    verifier(
      "minuscules : la séparation au jugé est signalée",
      lireListe("kone ibrahim - iron club")[0].motifs.some((m) =>
        m.includes("jugé"),
      ),
    );
    verifier(
      "club absent : signalé",
      lireListe("KONÉ Ibrahim")[0].motifs.includes("club absent"),
    );
    egal("liste vide : aucune ligne", lireListe("   \n  ").length, 0);

    verifier(
      "doublons : accents et casse ignorés",
      cleRapprochement("KONÉ", "Ibrahim") === cleRapprochement("kone", "ibrahim"),
    );
    verifier(
      "doublons : le second prénom n'entre pas dans la clé",
      cleRapprochement("YAO", "Serge") === cleRapprochement("YAO", "Serge Aristide"),
    );
    verifier(
      "doublons : un prénom différent est une autre personne",
      cleRapprochement("KONÉ", "Ibrahim") !== cleRapprochement("KONÉ", "Awa"),
    );

    /* ── 10. Cloisonnement des données personnelles ── */
    console.log("\n10. Cloisonnement des données personnelles");
    const champs = Object.keys(athVue[0]);
    for (const interdit of ["telephone", "contactUrgence", "commune", "age"]) {
      verifier(
        `la vue publique ne porte pas « ${interdit} »`,
        !champs.includes(interdit),
      );
    }
  } finally {
    await nettoyer();
    console.log("\nCompétition de test supprimée.");
  }

  console.log(
    `\n${reussis} vérification(s) réussie(s), ${echecs.length} échec(s).`,
  );
  if (echecs.length > 0) {
    for (const e of echecs) console.log(`  ✗ ${e}`);
    process.exit(1);
  }
  process.exit(0);
}

principal().catch((e) => {
  console.error("Tests interrompus :", e);
  process.exit(1);
});
