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
import { athlete, passage } from "./db/schema";

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
  const [cible] = await db
    .select()
    .from(passage)
    .where(eq(passage.id, passageId));
  if (!cible) return { ok: false, erreur: "Passage introuvable." };

  const [athleteAppele] = await db
    .select({ categorieId: athlete.categorieId })
    .from(athlete)
    .where(eq(athlete.id, cible.athleteId));

  const dejaAuPlateau = await db
    .select({ id: passage.id, categorieId: athlete.categorieId })
    .from(passage)
    .innerJoin(athlete, eq(athlete.id, passage.athleteId))
    .where(
      and(eq(passage.epreuveId, cible.epreuveId), eq(passage.statut, "plateau")),
    );

  const aRenvoyer = dejaAuPlateau
    .filter((p) => p.categorieId === (athleteAppele?.categorieId ?? null))
    .map((p) => p.id);
  if (aRenvoyer.length > 0) {
    await db
      .update(passage)
      .set({ statut: "avenir" })
      .where(inArray(passage.id, aRenvoyer));
  }

  await db
    .update(passage)
    .set({ statut: "plateau" })
    .where(eq(passage.id, passageId));

  return { ok: true };
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
 * Reconstruit la file de passage d'une épreuve.
 *
 * Les passages déjà terminés sont conservés : refaire l'ordre ne doit jamais
 * effacer une performance validée.
 */
export async function reconstruireFile(
  competitionId: string,
  epreuveId: string,
  athleteIdsDansLOrdre: string[],
): Promise<Resultat & { crees: number }> {
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
    await db
      .delete(passage)
      .where(
        and(eq(passage.epreuveId, epreuveId), inArray(passage.id, aSupprimer)),
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
  return { ok: true, crees: aCreer.length };
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
