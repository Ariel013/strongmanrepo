/**
 * Les écritures du plateau, séparées de leur enveloppe Server Action.
 *
 * Pourquoi ce fichier existe : les actions de `actions.ts` commencent toutes
 * par `exigerSession()`, qui lit les cookies de la requête. Hors requête —
 * c'est-à-dire dans un test — elles ne peuvent pas s'exécuter du tout. Trois
 * d'entre elles ont donc pu partir en production avec une requête SQL
 * invalide, sous 82 tests au vert : la suite vérifiait le barème, jamais les
 * écritures.
 *
 * Ce qui décide de l'état de la compétition vit donc ici, en fonctions
 * ordinaires, et `actions.ts` n'en garde que l'enveloppe : session, journal,
 * rafraîchissement des écrans. Ce qui est testable est testé.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { athlete, epreuve, passage } from "./db/schema";

/** Forme d'un identifiant : tout le reste vient d'ailleurs que de nos écrans. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Resultat {
  ok: boolean;
  erreur?: string;
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
export async function placerAuPlateau(passageId: string): Promise<Resultat> {
  if (!UUID.test(passageId)) return { ok: false, erreur: "Passage introuvable." };
  // Une transaction avec verrou : deux appels au même instant (deux postes,
  // deux onglets) ne laissent jamais deux athlètes au plateau pour la même
  // catégorie — le second attend le premier, puis le renvoie en file.
  return db.transaction(async (tx) => {
    const [cible] = await tx
      .select()
      .from(passage)
      .where(eq(passage.id, passageId))
      .for("update");
    if (!cible) return { ok: false, erreur: "Passage introuvable." };
    if (cible.statut === "termine")
      return { ok: false, erreur: "Ce passage est déjà validé : il ne revient pas au plateau." };

    const [athleteAppele] = await tx
      .select({ categorieId: athlete.categorieId })
      .from(athlete)
      .where(eq(athlete.id, cible.athleteId));

    const dejaAuPlateau = await tx
      .select({ id: passage.id, categorieId: athlete.categorieId })
      .from(passage)
      .innerJoin(athlete, eq(athlete.id, passage.athleteId))
      .where(
        and(eq(passage.epreuveId, cible.epreuveId), eq(passage.statut, "plateau")),
      );

    const aRenvoyer = dejaAuPlateau
      .filter((p) => p.categorieId === (athleteAppele?.categorieId ?? null))
      .filter((p) => p.id !== passageId)
      .map((p) => p.id);
    if (aRenvoyer.length > 0) {
      await tx
        .update(passage)
        .set({ statut: "avenir" })
        .where(inArray(passage.id, aRenvoyer));
    }

    await tx
      .update(passage)
      .set({ statut: "plateau" })
      .where(eq(passage.id, passageId));

    return { ok: true };
  });
}

/** Remet en file un passage appelé par erreur, sans résultat. */
export async function remettreEnFile(passageId: string): Promise<Resultat> {
  await db
    .update(passage)
    .set({
      statut: "avenir",
      resultatStatut: null,
      valeur: null,
      tempsS: null,
      tours: [],
      valideLe: null,
    })
    .where(eq(passage.id, passageId));
  return { ok: true };
}

/**
 * Libère le plateau sans verdict : le passage attend son résultat.
 *
 * Sur un grand terrain, le jury rend la performance bien après la fin du
 * chronomètre. Attendre pour appeler le suivant bloque la compétition ; ce
 * statut « à saisir » laisse la table appeler tout de suite, et remplir la
 * performance quand la feuille arrive. Ce que la table sait déjà — les tours
 * comptés, le temps du dernier — est conservé pour préremplir la saisie.
 *
 * Tant qu'il est « à saisir », le passage ne compte nulle part : ni au
 * classement, ni sur le mur LED, ni dans la file.
 */
export async function libererLePlateau(
  passageId: string,
  releve: { tours?: number[]; tempsS?: number | null; chronoS?: number | null } = {},
): Promise<Resultat> {
  const [cible] = await db
    .select({ statut: passage.statut })
    .from(passage)
    .where(eq(passage.id, passageId));
  if (!cible) return { ok: false, erreur: "Passage introuvable." };
  if (cible.statut !== "plateau")
    return {
      ok: false,
      erreur: "Seul un athlète au plateau peut être mis en attente de résultat.",
    };

  await db
    .update(passage)
    .set({
      statut: "a_saisir",
      resultatStatut: null,
      valeur: null,
      tempsS: releve.tempsS ?? null,
      tours: releve.tours ?? [],
      chronoS: releve.chronoS ?? null,
      valideLe: null,
    })
    .where(eq(passage.id, passageId));
  return { ok: true };
}

/**
 * Reconstruit la file de passage d'une épreuve, DANS UN PÉRIMÈTRE.
 *
 * Les passages déjà terminés sont conservés : refaire l'ordre ne doit jamais
 * effacer une performance validée. Ceux qui attendent leur résultat aussi :
 * l'athlète est passé, sa feuille est entre les mains du jury. Et celui qui
 * est AU PLATEAU : on ne renvoie pas en file quelqu'un en plein essai.
 *
 * Tout se fait en une transaction, après avoir vérifié que chaque athlète
 * demandé appartient bien à la compétition : sans cela, un identifiant
 * étranger faisait échouer l'insertion APRÈS la suppression, et la file
 * disparaissait sans être remplacée.
 *
 * Le périmètre est la liste des athlètes concernés par la reconstruction — en
 * pratique ceux des catégories affichées au plateau. Sans lui, reconstruire
 * l'ordre de « Plus de 105 kg » supprimait TOUS les passages non terminés de
 * l'épreuve, y compris ceux de « Moins de 105 kg », et ne recréait que les
 * siens : l'autre catégorie perdait sa file sans un mot.
 */
export async function reconstruireFile(
  competitionId: string,
  epreuveId: string,
  athleteIdsDansLOrdre: string[],
  /** Les athlètes dont les passages peuvent être remplacés. */
  perimetre: string[] = athleteIdsDansLOrdre,
): Promise<Resultat & { crees: number }> {
  if (!UUID.test(competitionId) || !UUID.test(epreuveId))
    return { ok: false, erreur: "Épreuve introuvable.", crees: 0 };
  const ids = [...new Set([...athleteIdsDansLOrdre, ...perimetre])];
  if (ids.length > 1000 || !ids.every((id) => UUID.test(id)))
    return { ok: false, erreur: "Liste d'athlètes invalide : rechargez la page.", crees: 0 };

  return db.transaction(async (tx) => {
    const [ep] = await tx
      .select({ id: epreuve.id })
      .from(epreuve)
      .where(and(eq(epreuve.id, epreuveId), eq(epreuve.competitionId, competitionId)));
    if (!ep) return { ok: false, erreur: "Épreuve introuvable dans cette compétition.", crees: 0 };
    if (ids.length > 0) {
      const connus = await tx
        .select({ id: athlete.id })
        .from(athlete)
        .where(and(eq(athlete.competitionId, competitionId), inArray(athlete.id, ids)));
      if (connus.length !== ids.length)
        return {
          ok: false,
          erreur: "Un athlète de la liste n'est pas de cette compétition : rechargez la page.",
          crees: 0,
        };
    }

    const existants = await tx
      .select()
      .from(passage)
      .where(eq(passage.epreuveId, epreuveId))
      .for("update");

    const dedans = new Set(perimetre);
    const conserve = (statut: string) =>
      statut === "termine" || statut === "a_saisir" || statut === "plateau";
    const gardes = new Set(
      existants.filter((p) => conserve(p.statut)).map((p) => p.athleteId),
    );

    const aSupprimer = existants
      .filter((p) => !conserve(p.statut) && dedans.has(p.athleteId))
      .map((p) => p.id);
    if (aSupprimer.length > 0) {
      await tx
        .delete(passage)
        .where(
          and(eq(passage.epreuveId, epreuveId), inArray(passage.id, aSupprimer)),
        );
    }

    // Les passages des autres catégories gardent leurs numéros d'ordre : les
    // nouveaux se rangent après, pour ne pas s'intercaler dans une file qu'on
    // n'a pas demandé à toucher.
    const restants = existants.filter(
      (p) => !conserve(p.statut) && !dedans.has(p.athleteId),
    );
    const depart = restants.reduce((m, p) => Math.max(m, p.ordre), 0);

    const aCreer = athleteIdsDansLOrdre
      .filter((id) => !gardes.has(id))
      .map((athleteId, i) => ({
        competitionId,
        epreuveId,
        athleteId,
        ordre: depart + i + 1,
        statut: "avenir",
      }));

    if (aCreer.length > 0) await tx.insert(passage).values(aCreer);
    return { ok: true, crees: aCreer.length };
  });
}

/**
 * Réaligne la file d'une épreuve sur l'ordre théorique — points acquis
 * croissants, dossards à la première épreuve — TANT QUE PERSONNE N'Y EST
 * PASSÉ.
 *
 * Le préchargement construit toutes les files d'un coup, par dossard, avant
 * qu'aucun résultat n'existe. Sans ce réalignement, la deuxième épreuve
 * gardait l'ordre des dossards au lieu de faire passer en premier celui qui
 * a le moins de points. Dès qu'un passage est au plateau, en attente ou
 * validé, la file ne bouge plus : on ne réordonne pas une épreuve commencée.
 */
export async function realignerFile(
  competitionId: string,
  epreuveId: string,
): Promise<{ realignee: boolean }> {
  if (!UUID.test(competitionId) || !UUID.test(epreuveId)) return { realignee: false };
  const { athletesDe, categoriesDe, epreuvesDe, ordrePour, tousLesResultats } =
    await import("./donnees");
  const existants = await db
    .select()
    .from(passage)
    .where(eq(passage.epreuveId, epreuveId));
  if (existants.length === 0 || existants.some((p) => p.statut !== "avenir"))
    return { realignee: false };

  const [epreuves, categories, athletes] = await Promise.all([
    epreuvesDe(competitionId),
    categoriesDe(competitionId),
    athletesDe(competitionId),
  ]);
  const ep = epreuves.find((e) => e.id === epreuveId);
  if (!ep) return { realignee: false };
  const resultats = await tousLesResultats(competitionId, epreuves);

  // Catégorie par catégorie, dans l'ordre des catégories : c'est ainsi que
  // le préchargement les range, et l'appel en duo lit chaque catégorie.
  const dansLaFile = new Set(existants.map((p) => p.athleteId));
  const voulu: string[] = [];
  for (const cat of categories.filter((c) => c.active))
    for (const a of ordrePour(ep, cat.id, epreuves, athletes, resultats))
      if (dansLaFile.has(a.id)) voulu.push(a.id);
  // Les passages d'athlètes hors des catégories actives gardent leur place, à la fin.
  for (const p of [...existants].sort((a, b) => a.ordre - b.ordre))
    if (!voulu.includes(p.athleteId)) voulu.push(p.athleteId);

  const actuel = [...existants].sort((a, b) => a.ordre - b.ordre).map((p) => p.athleteId);
  if (actuel.join(",") === voulu.join(",")) return { realignee: false };

  const parAthlete = new Map(existants.map((p) => [p.athleteId, p.id]));
  await db.transaction(async (tx) => {
    for (let i = 0; i < voulu.length; i++) {
      const id = parAthlete.get(voulu[i]);
      if (id) await tx.update(passage).set({ ordre: i + 1 }).where(eq(passage.id, id));
    }
  });
  return { realignee: true };
}

/**
 * Ajoute à une épreuve les athlètes qui n'y ont pas encore de passage.
 *
 * C'est le cas d'un engagé inscrit APRÈS le préchargement : les files
 * existent, il n'y figure pas, et rien ne l'y mettra sans effacer les autres.
 * Il se range en fin de file de sa catégorie, jamais devant quelqu'un.
 */
export async function completerFile(
  competitionId: string,
  epreuveId: string,
  athleteIds: string[],
): Promise<{ ajoutes: number }> {
  const existants = await db
    .select()
    .from(passage)
    .where(eq(passage.epreuveId, epreuveId));
  const deja = new Set(existants.map((p) => p.athleteId));
  const depart = existants.reduce((m, p) => Math.max(m, p.ordre), 0);

  const aCreer = athleteIds
    .filter((id) => !deja.has(id))
    .map((athleteId, i) => ({
      competitionId,
      epreuveId,
      athleteId,
      ordre: depart + i + 1,
      statut: "avenir",
    }));
  if (aCreer.length > 0) await db.insert(passage).values(aCreer);
  return { ajoutes: aCreer.length };
}

/**
 * Affecte une catégorie à plusieurs athlètes d'un coup.
 *
 * `"hors"` déclare l'athlète indépendant ; la chaîne vide le remet « à
 * déterminer par la pesée ».
 */
export async function affecterCategorieA(
  athleteIds: string[],
  cible: string,
): Promise<Resultat> {
  if (athleteIds.length === 0)
    return { ok: false, erreur: "Aucun athlète sélectionné." };

  const valeurs =
    cible === "hors"
      ? { categorieId: null, horsClassement: true }
      : cible === ""
        ? { categorieId: null, horsClassement: false }
        : { categorieId: cible, horsClassement: false };

  await db.update(athlete).set(valeurs).where(inArray(athlete.id, athleteIds));
  return { ok: true };
}
