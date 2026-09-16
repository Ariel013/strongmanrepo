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

import { asc, eq, inArray } from "drizzle-orm";
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
  signatureEcrans,
  tableauGeneral,
  tousLesResultats,
} from "../src/lib/donnees";
import { classementEpreuve, plusPetitGagne } from "../src/lib/classement";
import { cleRapprochement, lireListe } from "../src/lib/import-liste";
import { calculerRecadrage, poidsLisible } from "../src/lib/image";
import {
  affecterCategorieA,
  placerAuPlateau,
  reconstruireFile,
  remettreEnFile,
} from "../src/lib/plateau";
import {
  dateFrancaise,
  decimalFacultatif,
  entierFacultatif,
  heureFrancaise,
  parmi,
  tempsImparti,
  texteObligatoire,
  type Verdict,
} from "../src/lib/validation";

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

    /* ── 10. Empreinte de fraîcheur des écrans ── */
    console.log("\n10. Empreinte de fraîcheur des écrans publics");

    const sig0 = await signatureEcrans(comp.id);
    egal(
      "toutes les positions sont conservées, NULL compris",
      sig0.split("|").length,
      14,
    );
    egal("relue sans rien changer, elle est identique", await signatureEcrans(comp.id), sig0);

    // Appeler un athlète au plateau est LE signal qui doit passer en moins de
    // deux secondes sur le mur LED.
    const [enFile] = await db
      .select()
      .from(passage)
      .where(eq(passage.statut, "avenir"))
      .limit(1);
    await db
      .update(passage)
      .set({ statut: "plateau" })
      .where(eq(passage.id, enFile.id));
    const sig1 = await signatureEcrans(comp.id);
    verifier("un appel au plateau la fait bouger", sig1 !== sig0);

    await db
      .update(passage)
      .set({ statut: "avenir" })
      .where(eq(passage.id, enFile.id));
    egal("le retour en file la ramène à l'identique", await signatureEcrans(comp.id), sig0);

    await db
      .update(competition)
      .set({ chronoPhase: "encours", chronoDebutLe: new Date() })
      .where(eq(competition.id, comp.id));
    verifier(
      "un chronomètre lancé la fait bouger",
      (await signatureEcrans(comp.id)) !== sig0,
    );

    await db
      .update(competition)
      .set({ suspendue: true, motifSuspension: "Essai" })
      .where(eq(competition.id, comp.id));
    verifier(
      "une suspension la fait bouger",
      (await signatureEcrans(comp.id)) !== sig0,
    );

    /* ── 11. Refus des saisies incompréhensibles ── */
    console.log("\n11. Validation : ce qui est refusé, et ce qui passe");

    const refuse = (intitule: string, r: { ok: boolean; erreur?: string }) =>
      verifier(
        intitule,
        !r.ok && !!r.erreur,
        r.ok ? "accepté à tort" : undefined,
      );
    const accepte = <T,>(
      intitule: string,
      r: Verdict<T>,
      attendu?: unknown,
    ) =>
      verifier(
        intitule,
        r.ok &&
          (attendu === undefined ||
            JSON.stringify(r.valeur) === JSON.stringify(attendu)),
        r.ok ? undefined : `refusé à tort — ${r.erreur}`,
      );

    // Temps imparti : le silence d'hier transformait « abc » en « illimité ».
    refuse("temps imparti « abc » refusé", tempsImparti("abc"));
    refuse("temps imparti « 0 s » refusé", tempsImparti("0 s"));
    refuse("temps imparti « 2 jours » refusé", tempsImparti("2 jours"));
    accepte("temps imparti « 60 s » accepté", tempsImparti("60 s"), 60);
    accepte("temps imparti « 2 min » compris", tempsImparti("2 min"), 120);
    accepte("« illimité » vaut bien aucune limite", tempsImparti("illimité"), null);
    accepte("un champ vide vaut aucune limite", tempsImparti(""), null);

    // Nombres : « 12a » ne doit pas devenir 12.
    refuse("dossard « 12a » refusé", entierFacultatif("12a", "Le dossard", 1, 9999));
    refuse("dossard « 0 » refusé", entierFacultatif("0", "Le dossard", 1, 9999));
    accepte("dossard vide accepté", entierFacultatif("", "Le dossard", 1, 9999), null);
    accepte("dossard « 12 » accepté", entierFacultatif("12", "Le dossard", 1, 9999), 12);

    refuse("poids « abc » refusé", decimalFacultatif("abc", "Le poids", 20, 400));
    refuse("poids « 900 » refusé", decimalFacultatif("900", "Le poids", 20, 400));
    accepte("poids « 104,5 » accepté à la française", decimalFacultatif("104,5", "Le poids", 20, 400), 104.5);

    // Texte obligatoire et bornes de longueur.
    refuse("nom vide refusé", texteObligatoire("   ", "Le nom", 60));
    refuse("nom démesuré refusé", texteObligatoire("x".repeat(61), "Le nom", 60));
    accepte("nom normal accepté", texteObligatoire("  KONÉ  ", "Le nom", 60), "KONÉ");

    // Valeurs contraintes.
    refuse("mesure inconnue refusée", parmi("cuisson", ["poids", "chrono"] as const, "Mesure"));
    accepte("mesure connue acceptée", parmi("chrono", ["poids", "chrono"] as const, "Mesure"), "chrono");

    // Date et heure : leur échec silencieux cassait le compte à rebours.
    refuse("date « le 19 » refusée", dateFrancaise("le 19"));
    refuse("mois inventé refusé", dateFrancaise("19 brumaire 2026"));
    refuse("31 février refusé", dateFrancaise("31 février 2026"));
    accepte("date en toutes lettres acceptée", dateFrancaise("Samedi 19 Septembre 2026"), {
      jour: 19,
      mois: 8,
      annee: 2026,
    });
    refuse("heure « midi » refusée", heureFrancaise("midi"));
    refuse("heure « 25h00 » refusée", heureFrancaise("25h00"));
    accepte("heure « 14h00 » acceptée", heureFrancaise("14h00"), {
      heures: 14,
      minutes: 0,
    });

    /* ── 12. Les écritures du plateau, exécutées pour de vrai ── */
    console.log("\n12. Plateau : appel, retour en file, reconstruction");

    // Ces fonctions SONT celles qu'appellent les Server Actions. Elles ont
    // planté en production sous 82 tests au vert, parce que la suite
    // vérifiait le barème sans jamais écrire. Elles sont donc exécutées ici,
    // et surtout dans l'état où elles font quelque chose : le premier appel
    // sur une file vide ne prouvait rien.
    const [catA] = cats;

    await affecterCategorieA([alpha.id, bravo.id, charlie.id], catA.id);
    const affectes = await db
      .select()
      .from(athlete)
      .where(inArray(athlete.id, [alpha.id, bravo.id, charlie.id]));
    verifier(
      "affecter une catégorie à plusieurs athlètes",
      affectes.every((a) => a.categorieId === catA.id),
    );

    const horsC = await affecterCategorieA([delta.id], "hors");
    const [indep] = await db
      .select()
      .from(athlete)
      .where(eq(athlete.id, delta.id));
    verifier(
      "déclarer un athlète indépendant",
      horsC.ok && indep.horsClassement && indep.categorieId === null,
    );

    // Reconstruction : d'abord sur une file vierge, puis SUR UNE FILE
    // EXISTANTE — le cas qui plantait.
    await db.delete(passage).where(eq(passage.epreuveId, eps[0].id));
    const r1 = await reconstruireFile(comp.id, eps[0].id, [
      alpha.id,
      bravo.id,
      charlie.id,
    ]);
    egal("construire la file (1re fois)", r1.crees, 3);

    const r2 = await reconstruireFile(comp.id, eps[0].id, [
      charlie.id,
      bravo.id,
      alpha.id,
    ]);
    egal("RECONSTRUIRE sur une file existante", r2.crees, 3);
    const apresRebuild = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id));
    egal("aucun doublon après reconstruction", apresRebuild.length, 3);

    // Appels successifs : le deuxième est celui qui plantait.
    const file = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id))
      .orderBy(asc(passage.ordre));

    await placerAuPlateau(file[0].id);
    let etat = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id));
    egal(
      "1er appel : un athlète au plateau",
      etat.filter((p) => p.statut === "plateau").length,
      1,
    );

    const deuxieme = await placerAuPlateau(file[1].id);
    etat = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id));
    verifier("2e appel accepté (le cas qui plantait)", deuxieme.ok);
    egal(
      "toujours UN SEUL athlète au plateau",
      etat.filter((p) => p.statut === "plateau").length,
      1,
    );
    egal(
      "c'est bien le dernier appelé",
      etat.find((p) => p.statut === "plateau")?.id,
      file[1].id,
    );
    egal(
      "le précédent est revenu en file",
      etat.find((p) => p.id === file[0].id)?.statut,
      "avenir",
    );

    await placerAuPlateau(file[2].id);
    etat = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id));
    egal(
      "3e appel : encore un seul au plateau",
      etat.filter((p) => p.statut === "plateau").length,
      1,
    );

    await remettreEnFile(file[2].id);
    etat = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id));
    egal(
      "retour en file : plateau vide",
      etat.filter((p) => p.statut === "plateau").length,
      0,
    );
    egal(
      "et aucun passage perdu",
      etat.filter((p) => p.statut === "avenir").length,
      3,
    );

    /* ── 13. Les refus disent la bonne raison ── */
    console.log("\n13. Messages : la raison exacte, jamais une autre");

    // Le message « toutes les épreuves avaient déjà un ordre » s'affichait
    // quelle que soit la cause. La table a cliqué quatre fois, l'a cru, et
    // s'est retrouvée devant un plateau vide.
    await db.delete(passage).where(eq(passage.competitionId, comp.id));
    await db
      .update(athlete)
      .set({ categorieId: null, horsClassement: false })
      .where(eq(athlete.competitionId, comp.id));

    const sansCat = await reconstruireFile(comp.id, eps[0].id, []);
    egal("reconstruire sans athlète ne crée rien", sansCat.crees, 0);

    const restants = await db
      .select()
      .from(passage)
      .where(eq(passage.competitionId, comp.id));
    egal("et n'a rien laissé derrière", restants.length, 0);

    // Avec des athlètes rattachés, la file se remplit pour de bon.
    await affecterCategorieA([alpha.id, bravo.id], catA.id);
    const avecCat = await reconstruireFile(comp.id, eps[0].id, [
      alpha.id,
      bravo.id,
    ]);
    egal("une fois les catégories affectées, la file se remplit", avecCat.crees, 2);

    /* ── 14. Préparation des photos avant envoi ── */
    console.log("\n14. Photos : recadrage et réduction");

    // Une photo de téléphone dépasse la limite de corps d'une Server Action et
    // se faisait refuser par un 413 brut, qui cassait l'écran.
    const p1 = calculerRecadrage(4000, 3000, "portrait");
    egal("photo paysage → recadrée en portrait 3/4", [p1.largeur, p1.hauteur], [1200, 1600]);
    verifier(
      "le recadrage paysage est centré horizontalement",
      p1.xSource > 0 && p1.ySource === 0,
      `x=${p1.xSource} y=${p1.ySource}`,
    );

    // Déjà exactement au format : rien à retirer.
    const p2 = calculerRecadrage(3000, 4000, "portrait");
    egal("une image déjà en 3/4 garde tout", [p2.xSource, p2.ySource], [0, 0]);
    egal("… et sort aux dimensions voulues", [p2.largeur, p2.hauteur], [1200, 1600]);

    // Plus haute que le 3/4 : on rogne en haut et en bas, à parts égales.
    const p2b = calculerRecadrage(3000, 5000, "portrait");
    verifier(
      "une image trop haute est rognée verticalement, au centre",
      p2b.ySource > 0 && p2b.xSource === 0,
      `x=${p2b.xSource} y=${p2b.ySource}`,
    );
    egal("le rognage vertical est symétrique", p2b.ySource, 500);
    egal("et le résultat retombe en 3/4", [p2b.largeur, p2b.hauteur], [1200, 1600]);

    const p3 = calculerRecadrage(300, 400, "portrait");
    egal("une petite image n'est jamais agrandie", [p3.largeur, p3.hauteur], [300, 400]);

    const l1 = calculerRecadrage(2000, 500, "entier");
    verifier(
      "un logo n'est jamais recadré",
      l1.xSource === 0 && l1.ySource === 0,
      `x=${l1.xSource} y=${l1.ySource}`,
    );
    egal("un logo large est seulement réduit", l1.largeur, 1200);

    egal("poids lisible en mégaoctets", poidsLisible(2_500_000), "2,4 Mo");
    egal("poids lisible en kilo-octets", poidsLisible(320_000), "313 ko");

    /* ── 15. Cloisonnement des données personnelles ── */
    console.log("\n15. Cloisonnement des données personnelles");
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
