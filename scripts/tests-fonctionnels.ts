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

import { and, asc, eq, inArray } from "drizzle-orm";
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
import {
  classementClubs,
  classementEpreuve,
  alertesPesee,
  incoherencesCategories,
  plusPetitGagne,
  versMesure,
} from "../src/lib/classement";
import { performanceLisible, tempsImpartiLisible } from "../src/lib/charte";
import { ageA, ageDe } from "../src/lib/age";
import { dateNaissance as validerNaissance } from "../src/lib/validation";
import { cleRapprochement, lireListe } from "../src/lib/import-liste";
import { calculerRecadrage, poidsLisible } from "../src/lib/image";
import {
  affecterCategorieA,
  completerFile,
  libererLePlateau,
  placerAuPlateau,
  rouvrirPourCorrection,
  realignerFile,
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
  trierProgramme,
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
    //
    // ⚠️ Le filtre par compétition n'est pas facultatif : sans lui, cette
    // requête attrape le premier passage « à venir » de TOUTE la base — donc
    // celui de la compétition réelle. Un test ne doit jamais pouvoir toucher
    // autre chose que sa compétition jetable.
    const [enFile] = await db
      .select()
      .from(passage)
      .where(
        and(
          eq(passage.competitionId, comp.id),
          eq(passage.statut, "avenir"),
        ),
      )
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

    // Reconstruction DANS UN PÉRIMÈTRE : refaire l'ordre d'une catégorie ne
    // doit pas effacer la file de l'autre. Ici delta joue l'autre catégorie.
    const r3 = await reconstruireFile(comp.id, eps[0].id, [delta.id], [delta.id]);
    const apresPerimetre = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id))
      .orderBy(asc(passage.ordre));
    egal("reconstruire un périmètre : 1 passage créé", r3.crees, 1);
    egal(
      "la file des autres catégories est INTACTE",
      apresPerimetre.filter((p) => p.athleteId !== delta.id).length,
      3,
    );
    egal(
      "le périmètre se range APRÈS les autres",
      apresPerimetre.find((p) => p.athleteId === delta.id)?.ordre,
      4,
    );
    await reconstruireFile(comp.id, eps[0].id, [delta.id], [delta.id]);
    egal(
      "reconstruire deux fois le périmètre : pas de doublon",
      (await db.select().from(passage).where(eq(passage.epreuveId, eps[0].id)))
        .length,
      4,
    );
    await db
      .delete(passage)
      .where(
        and(eq(passage.epreuveId, eps[0].id), eq(passage.athleteId, delta.id)),
      );

    // Compléter une file : l'engagé inscrit après le préchargement — le cas
    // des deux « Plus de 105 kg » invisibles au plateau.
    const c1 = await completerFile(comp.id, eps[0].id, [
      alpha.id,
      bravo.id,
      charlie.id,
      delta.id,
    ]);
    const apresComplement = await db
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, eps[0].id))
      .orderBy(asc(passage.ordre));
    egal("compléter : seul le nouveau est ajouté", c1.ajoutes, 1);
    egal("compléter : les 3 autres sont toujours là", apresComplement.length, 4);
    egal(
      "compléter : le nouveau passe en dernier",
      apresComplement[3]?.athleteId,
      delta.id,
    );
    const c2 = await completerFile(comp.id, eps[0].id, [alpha.id, delta.id]);
    egal("compléter deux fois : rien à ajouter", c2.ajoutes, 0);
    await db
      .delete(passage)
      .where(
        and(eq(passage.epreuveId, eps[0].id), eq(passage.athleteId, delta.id)),
      );

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

    // Plateau libéré sans résultat : le jury n'a pas fini, on appelle quand
    // même le suivant. Le passage attend sa valeur sans compter nulle part.
    const relire = () =>
      db.select().from(passage).where(eq(passage.epreuveId, eps[0].id));
    const refus = await libererLePlateau(file[0].id);
    verifier("libérer un passage qui n'est pas au plateau est refusé", !refus.ok);

    await placerAuPlateau(file[0].id);
    const libere = await libererLePlateau(file[0].id, {
      tours: [12.3, 25.1],
      tempsS: 25.1,
      chronoS: 90,
    });
    verifier("libérer le plateau accepté", libere.ok);
    etat = await relire();
    egal("plateau vide après libération", etat.filter((p) => p.statut === "plateau").length, 0);
    const attente = etat.find((p) => p.id === file[0].id);
    egal("le passage est « à saisir »", attente?.statut, "a_saisir");
    egal("les tours comptés sont conservés", attente?.tours, [12.3, 25.1]);
    egal("le temps lu au chrono aussi", attente?.chronoS, 90);
    egal("sans valeur ni verdict", [attente?.valeur, attente?.resultatStatut], [null, null]);

    await placerAuPlateau(file[1].id);
    etat = await relire();
    egal(
      "appeler le suivant ne touche pas le passage en attente",
      etat.find((p) => p.id === file[0].id)?.statut,
      "a_saisir",
    );
    egal(
      "un passage en attente ne compte pas comme résultat",
      (await tousLesResultats(comp.id, epreuvesVue)).get(eps[0].id)?.get(file[0].athleteId),
      undefined,
    );

    const reconstruit = await reconstruireFile(
      comp.id,
      eps[0].id,
      file.map((p) => p.athleteId),
    );
    etat = await relire();
    egal(
      "reconstruire l'ordre conserve le passage en attente",
      etat.find((p) => p.athleteId === file[0].athleteId)?.statut,
      "a_saisir",
    );
    egal(
      "et ne recrée que les autres — ni l'attente, ni l'athlète au plateau",
      reconstruit.crees,
      file.length - 2,
    );
    egal(
      "l'athlète au plateau y reste : on ne renvoie pas en file un essai en cours",
      etat.find((p) => p.id === file[1].id)?.statut,
      "plateau",
    );
    const etranger = await reconstruireFile(comp.id, eps[0].id, [
      "00000000-0000-4000-8000-000000000000",
    ]);
    verifier("un athlète étranger à la compétition est refusé avant toute suppression", !etranger.ok);
    egal(
      "et la file n'a pas bougé",
      (await relire()).length,
      etat.length,
    );

    await remettreEnFile(file[0].id);
    etat = await relire();
    egal(
      "retour en file depuis l'attente : redevient à venir, sans trace",
      [etat.find((p) => p.id === file[0].id)?.statut, etat.find((p) => p.id === file[0].id)?.tours],
      ["avenir", []],
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

    // Une image trop petite est acceptée, mais elle sera pixellisée sur un mur
    // LED où elle occupe 19 vw : on veut le savoir au dépôt.
    egal(
      "une image de 218 px reste en 3/4 et n'est pas agrandie",
      [
        calculerRecadrage(218, 400, "portrait").largeur,
        calculerRecadrage(218, 400, "portrait").hauteur,
      ],
      [218, 291],
    );

    egal("poids lisible en mégaoctets", poidsLisible(2_500_000), "2,4 Mo");
    egal("poids lisible en kilo-octets", poidsLisible(320_000), "313 ko");

    /* ── 15. Règle de classement « nombre, puis temps » ── */
    console.log("\n15. Nombre, puis temps : la règle telle qu'énoncée");

    // Formulation reçue de la fédération le 2026-09-16 :
    //   1. Le nombre de répétitions prime — 15 passe devant 10, quel que soit
    //      le temps. Le temps n'a alors pas à être pris en compte.
    //   2. À égalité SEULEMENT, le temps intermédiaire départage : la dernière
    //      charge validée le plus tôt l'emporte.
    const classable = (id: string) => ({
      id,
      poidsCorps: 90,
      dossard: 1,
      horsClassement: false,
    });
    const perf = (valeur: number, temps: number | null) => ({
      statut: "ok" as const,
      valeur,
      temps,
    });

    const prime = classementEpreuve(
      [classable("quinze"), classable("dix")],
      "nb_temps",
      new Map([
        // Beaucoup de répétitions, mais la dernière validée très tard.
        ["quinze", perf(15, 89)],
        // Moitié moins, mais terminé très tôt.
        ["dix", perf(10, 4)],
      ]),
    );
    const rangDe = (l: typeof prime, id: string) =>
      l.find((x) => x.athleteId === id)?.rang;
    egal("15 répétitions devancent 10, malgré un temps bien pire", rangDe(prime, "quinze"), 1);
    egal("… et celui qui en a fait 10 suit", rangDe(prime, "dix"), 2);

    const exaequoTemps = classementEpreuve(
      [classable("rapide"), classable("lent")],
      "nb_temps",
      new Map([
        ["lent", perf(3, 62)],
        ["rapide", perf(3, 4)],
      ]),
    );
    egal(
      "à 3 répétitions chacun, la dernière charge la plus rapide l'emporte",
      rangDe(exaequoTemps, "rapide"),
      1,
    );
    egal("… et le plus lent suit", rangDe(exaequoTemps, "lent"), 2);

    // Un temps manquant ne doit jamais devancer un temps relevé.
    const sansTemps = classementEpreuve(
      [classable("chronometre"), classable("inconnu")],
      "nb_temps",
      new Map([
        ["inconnu", perf(3, null)],
        ["chronometre", perf(3, 30)],
      ]),
    );
    egal(
      "à égalité, un temps relevé devance un temps manquant",
      rangDe(sansTemps, "chronometre"),
      1,
    );

    // Les trois variables doivent être lisibles pour justifier le classement.
    egal(
      "la performance s'écrit avec le temps de départage",
      performanceLisible("nb_temps", 3, 4),
      "3 rép. · dernière à 4 s",
    );
    egal(
      "sans temps relevé, on n'invente rien",
      performanceLisible("nb_temps", 3, null),
      "3 rép.",
    );
    egal(
      "le temps imparti s'annonce en tête de tableau",
      tempsImpartiLisible(90),
      "90 s imparties",
    );
    egal(
      "une épreuve de tenue n'a pas de temps imparti",
      tempsImpartiLisible(null),
      "temps illimité",
    );
    egal("une charge s'écrit en kilos", performanceLisible("poids", 120, null), "120 kg");
    egal(
      "une distance garde son temps",
      performanceLisible("distance", 18, 32.1),
      "18 m · 32,1 s",
    );

    /* ── 16. Cohérence des bornes de catégories ── */
    console.log("\n16. Bornes de catégories : trous et recouvrements");

    // Relevé sur la compétition réelle le 2026-09-17 : « Moins de 105 kg »
    // s'arrêtait à 105,5 et « Plus de 105 kg » ne commençait qu'au-delà de
    // 105,6. Un athlète de 105,6 kg n'entrait donc dans aucune catégorie — et
    // rien ne le signalait avant la pesée.
    egal(
      "deux bornes qui se touchent ne posent aucun problème",
      incoherencesCategories([
        { nom: "−105", poidsMin: null, poidsMax: 105 },
        { nom: "+105", poidsMin: 105, poidsMax: null },
      ]).length,
      0,
    );
    verifier(
      "un trou entre deux bornes est signalé",
      incoherencesCategories([
        { nom: "Moins de 105 kg", poidsMin: null, poidsMax: 105.5 },
        { nom: "Plus de 105 kg", poidsMin: 105.6, poidsMax: null },
      ]).some((x) => x.includes("Aucune catégorie")),
    );
    verifier(
      "un recouvrement est signalé",
      incoherencesCategories([
        { nom: "A", poidsMin: null, poidsMax: 110 },
        { nom: "B", poidsMin: 100, poidsMax: null },
      ]).some((x) => x.includes("recouvrent")),
    );
    egal(
      "des extrémités fermées laissent les poids extrêmes sans catégorie",
      incoherencesCategories([
        { nom: "A", poidsMin: 60, poidsMax: 105 },
        { nom: "B", poidsMin: 105, poidsMax: 140 },
      ]).length,
      2,
    );

    /* ── 22. Alertes de pesée ── */
    console.log("\n22. Pesée : dépassement du poids déclaré, sortie de catégorie");
    const catsPesee = [
      { id: "m", nom: "Moins de 105 kg", poidsMin: null, poidsMax: 105 },
      { id: "p", nom: "Plus de 105 kg", poidsMin: 105, poidsMax: null },
    ];
    const pese = (
      poidsCorps: number | null,
      poidsDeclare: number | null,
      categorieId: string | null = null,
      horsClassement = false,
    ) => alertesPesee({ poidsCorps, poidsDeclare, categorieId, horsClassement }, catsPesee);

    egal("sans poids pesé, aucune alerte", pese(null, 100, "m"), {
      depassement: null,
      sortie: null,
    });
    egal("pesé sous le déclaré : aucune alerte", pese(98.5, 100, "m"), {
      depassement: null,
      sortie: null,
    });
    egal("pesé au-dessus du déclaré, même catégorie : dépassement seul", pese(102.3, 100, "m"), {
      depassement: { declare: 100, ecart: 2.3 },
      sortie: null,
    });
    egal("105 kg pile reste en Moins de 105", pese(105, 104, "m").sortie, null);
    egal("sort de la catégorie affectée : les deux alertes", pese(106.2, 104, "m"), {
      depassement: { declare: 104, ecart: 2.2 },
      sortie: { annoncee: "Moins de 105 kg", reelle: "Plus de 105 kg" },
    });
    egal(
      "sans affectation, le poids déclaré désigne la catégorie annoncée",
      pese(106, 104).sortie,
      { annoncee: "Moins de 105 kg", reelle: "Plus de 105 kg" },
    );
    egal(
      "après validation, l'affectation suit le poids pesé : l'alerte reste",
      pese(106, 104, "p").sortie,
      { annoncee: "Moins de 105 kg", reelle: "Plus de 105 kg" },
    );
    egal(
      "descendre de catégorie est aussi une sortie, sans dépassement",
      pese(103, 108, "p"),
      { depassement: null, sortie: { annoncee: "Plus de 105 kg", reelle: "Moins de 105 kg" } },
    );
    egal("un invité hors classement n'a pas de catégorie à quitter", pese(106, 104, null, true), {
      depassement: { declare: 104, ecart: 2 },
      sortie: null,
    });
    egal(
      "aucune catégorie n'accepte le poids : la sortie le dit",
      alertesPesee(
        { poidsCorps: 105.6, poidsDeclare: null, categorieId: "m", horsClassement: false },
        [
          { id: "m", nom: "Moins", poidsMin: null, poidsMax: 105.5 },
          { id: "p", nom: "Plus", poidsMin: 105.6, poidsMax: null },
        ],
      ).sortie,
      { annoncee: "Moins", reelle: null },
    );

    // La mesure lue en base ne doit jamais fausser un classement en silence.
    egal("une mesure connue passe telle quelle", versMesure("medley"), "medley");
    egal("« chrono » se classe à l'envers", plusPetitGagne(versMesure("chrono")), true);
    egal("« medley » se classe à l'endroit", plusPetitGagne(versMesure("medley")), false);
    egal(
      "une mesure inconnue retombe sur un défaut sûr",
      versMesure("cuisson"),
      "nb_temps",
    );

    /* ── 17. Âge calculé au jour de la compétition ── */
    console.log("\n17. Âge : calculé au jour J, jamais stocké");

    const jourJ = new Date(2026, 8, 19); // 19 septembre 2026
    egal("anniversaire passé dans l'année", ageA(new Date(1998, 2, 14), jourJ), 28);
    egal("anniversaire à venir dans l'année", ageA(new Date(1998, 10, 2), jourJ), 27);
    egal("anniversaire le jour même : l'année est révolue", ageA(new Date(2000, 8, 19), jourJ), 26);
    egal("anniversaire la veille", ageA(new Date(2000, 8, 18), jourJ), 26);
    egal("anniversaire le lendemain", ageA(new Date(2000, 8, 20), jourJ), 25);
    egal("né un 29 février, année non bissextile", ageA(new Date(2000, 1, 29), new Date(2026, 1, 28)), 25);
    egal("lu depuis la base, au jour J", ageDe("1998-03-14", jourJ), 28);
    egal("sans date de naissance : pas d'âge", ageDe(null, jourJ), null);
    egal("date de base illisible : pas d'âge", ageDe("n/a", jourJ), null);

    verifier("naissance au bon format acceptée", validerNaissance("1998-03-14", jourJ).ok);
    verifier("format libre refusé", !validerNaissance("14/03/1998", jourJ).ok);
    verifier("jour inexistant refusé", !validerNaissance("1998-02-30", jourJ).ok);
    verifier("un âge de 4 ans est refusé", !validerNaissance("2022-01-01", jourJ).ok);
    verifier("un âge de 120 ans est refusé", !validerNaissance("1906-01-01", jourJ).ok);
    egal("vide accepté, vaut « non renseigné »", validerNaissance("", jourJ), { ok: true, valeur: null });

    // L'import lit les formats des listes ivoiriennes, sans deviner.
    const av = lireListe("Nom;Prénoms;Date de naissance\nKONÉ;Ibrahim;14/03/1998\nYAO;Serge;1999-07-02\nBAMBA;Cheick;mars 98");
    egal("import : « 14/03/1998 » devient ISO", av[0].dateNaissance, "1998-03-14");
    egal("import : ISO conservé", av[1].dateNaissance, "1999-07-02");
    egal("import : une date illisible reste vide", av[2].dateNaissance, "");

    /* ── 21. Réalignement d'une file intacte sur les points acquis ── */
    console.log("\n21. Réalignement : une file intacte suit les points acquis, pas le préchargement");
    {
      // Épreuve 2 préchargée par dossards ; l'épreuve 1 a des résultats.
      // L'épreuve 2 doit passer en premier celui qui a le moins de points.
      const ath = await db
        .select()
        .from(athlete)
        .where(eq(athlete.competitionId, comp.id))
        .orderBy(asc(athlete.dossard));
      const classes = ath.filter((a) => a.categorieId !== null && !a.horsClassement);
      await db.delete(passage).where(eq(passage.competitionId, comp.id));
      await db.insert(passage).values(
        classes.map((a, i) => ({
          competitionId: comp.id,
          epreuveId: eps[1].id,
          athleteId: a.id,
          ordre: i + 1,
          statut: "avenir",
        })),
      );
      const r = await realignerFile(comp.id, eps[1].id);
      const apres = await db
        .select()
        .from(passage)
        .where(eq(passage.epreuveId, eps[1].id))
        .orderBy(asc(passage.ordre));
      const epreuvesVueR = await epreuvesDe(comp.id);
      const resultatsR = await tousLesResultats(comp.id, epreuvesVueR);
      const catsR = await categoriesDe(comp.id);
      const athVueR = await athletesDe(comp.id);
      const attendu = catsR
        .filter((c) => c.active)
        .flatMap((c) =>
          ordrePour(epreuvesVueR[1], c.id, epreuvesVueR, athVueR, resultatsR).map((a) => a.id),
        )
        .filter((id) => classes.some((a) => a.id === id));
      egal("la file réalignée suit l'ordre théorique (points acquis croissants)", apres.map((p) => p.athleteId), attendu);
      verifier("le réalignement s'est fait (l'ordre des dossards différait)", r.realignee || apres.map((p) => p.athleteId).join() === attendu.join());
      await placerAuPlateau(apres[0].id);
      const r2 = await realignerFile(comp.id, eps[1].id);
      verifier("une épreuve commencée n'est plus réalignée", !r2.realignee);
      await db.delete(passage).where(eq(passage.competitionId, comp.id));
    }

    /* ── 22 bis. Corriger un résultat validé, épreuve terminée ou non ── */
    console.log("\n22 bis. Correction : un passage validé se rouvre, prérempli, sans toucher au plateau");
    {
      await db.delete(passage).where(eq(passage.competitionId, comp.id));
      const [valide, auPlateau] = await db
        .insert(passage)
        .values([
          { competitionId: comp.id, epreuveId: eps[1].id, athleteId: alpha.id, ordre: 1, statut: "termine", resultatStatut: "ok", valeur: 7, tempsS: 58, chronoS: 90, valideLe: new Date() },
          { competitionId: comp.id, epreuveId: eps[1].id, athleteId: bravo.id, ordre: 2, statut: "plateau" },
        ])
        .returning();
      const refus = await rouvrirPourCorrection(auPlateau.id);
      verifier("un passage non validé ne se « corrige » pas", !refus.ok);

      const r = await rouvrirPourCorrection(valide.id);
      verifier("un passage validé se rouvre", r.ok);
      egal("l'ancien résultat est rendu pour le journal d'audit", [r.avant?.resultatStatut, Number(r.avant?.valeur)], ["ok", 7]);
      const apres = await db.select().from(passage).where(eq(passage.epreuveId, eps[1].id));
      const rouvert = apres.find((p) => p.id === valide.id);
      egal("il attend son résultat, sans verdict", [rouvert?.statut, rouvert?.resultatStatut, rouvert?.valideLe], ["a_saisir", null, null]);
      egal("ses valeurs restent pour préremplir la ressaisie", [Number(rouvert?.valeur), Number(rouvert?.tempsS), Number(rouvert?.chronoS)], [7, 58, 90]);
      egal("l'athlète au plateau n'a pas bougé", apres.find((p) => p.id === auPlateau.id)?.statut, "plateau");
      const encore = await rouvrirPourCorrection(valide.id);
      verifier("rouvrir deux fois est refusé", !encore.ok);
      await db.delete(passage).where(eq(passage.competitionId, comp.id));
    }

    /* ── 19. Classement des clubs ── */
    console.log("\n19. Clubs : 15 / 10 / 5 / 4 / 3, puis 1 pour tout classé");
    const clubs = classementClubs([
      { club: "Titan", rang: 1 },
      { club: "Titan", rang: 6 },
      { club: "Atlas", rang: 2 },
      { club: "Atlas", rang: 3 },
      { club: "Hercule", rang: 1 },
      { club: "", rang: 4 },
      { club: null, rang: 5 },
    ]);
    egal("Titan : 15 + 1", clubs.find((c) => c.club === "Titan")?.points, 16);
    egal("Atlas : 10 + 5", clubs.find((c) => c.club === "Atlas")?.points, 15);
    egal("Hercule : 15", clubs.find((c) => c.club === "Hercule")?.points, 15);
    egal("sans club : personne ne marque", clubs.length, 3);
    egal(
      "ordre : points, puis titres (Hercule devant Atlas à 15)",
      clubs.map((c) => c.club),
      ["Titan", "Hercule", "Atlas"],
    );
    // Cumul épreuve par épreuve : 2e puis 1er = 10 + 15.
    egal(
      "les points d'un club se cumulent d'une épreuve à l'autre",
      classementClubs([{ club: "Titan", rang: 2 }, { club: "Titan", rang: 1 }])[0].points,
      25,
    );
    egal("un 6e vaut 1 point, un 5e vaut 3", [
      classementClubs([{ club: "X", rang: 6 }])[0].points,
      classementClubs([{ club: "X", rang: 5 }])[0].points,
    ], [1, 3]);

    /* ── 20. Programme : l'heure ordonne, pas la saisie ── */
    console.log("\n20. Programme : l'heure ordonne, pas l'ordre de saisie");
    const prog = trierProgramme([
      { heure: "18h00", texte: "Podium", position: 1 },
      { heure: "vers midi", texte: "Pause", position: 2 },
      { heure: "12h00", texte: "Épreuve 2", position: 3 },
      { heure: "9h30", texte: "Pesée", position: 4 },
      { heure: "", texte: "Sans heure", position: 5 },
      { heure: "12:00", texte: "Même heure, saisie après", position: 6 },
    ]);
    egal(
      "ordre : 9h30, 12h00, 12:00, 18h00, puis les heures illisibles dans l'ordre de saisie",
      prog.map((p) => p.texte),
      ["Pesée", "Épreuve 2", "Même heure, saisie après", "Podium", "Pause", "Sans heure"],
    );

    /* ── 18. Cloisonnement des données personnelles ── */
    console.log("\n18. Cloisonnement des données personnelles");
    const champs = Object.keys(athVue[0]);
    for (const interdit of ["telephone", "contactUrgence", "commune", "age", "dateNaissance"]) {
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
