/**
 * Réparation ponctuelle du 2026-09-20 — épreuve « Tirage de camion » annulée.
 *
 * L'épreuve a été annulée et la table a saisi « 0 » comme PERFORMANCE au lieu
 * du verdict ZÉRO. Vingt-et-un passages « ok · valeur 0 » ont donc été classés
 * et ont distribué des points au poids de corps. Ce script les passe en
 * verdict ZÉRO (valeur vide), ainsi que le passage du dossard 6 resté en
 * attente de résultat, à la demande de Kevin.
 *
 * Garde : il n'écrit que si la cible est EXACTEMENT celle qui a été
 * diagnostiquée (21 + 1). Tout écart l'arrête avant la première écriture.
 * Chaque passage touché laisse une ligne au journal d'audit avec son ancien
 * résultat. Une seule transaction.
 *
 *   pnpm exec tsx --env-file=.env scripts/annuler-epreuve-camion.ts          (à blanc)
 *   pnpm exec tsx --env-file=.env scripts/annuler-epreuve-camion.ts --ecrire
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { athlete, epreuve, journal, passage } from "../src/lib/db/schema";
import { competitionCourante } from "../src/lib/donnees";

const ECRIRE = process.argv.includes("--ecrire");

async function principal() {
  const comp = await competitionCourante();
  if (!comp) throw new Error("Aucune compétition courante.");
  const eps = await db
    .select()
    .from(epreuve)
    .where(and(eq(epreuve.competitionId, comp.id), eq(epreuve.nom, "Tirage de camion")));
  if (eps.length !== 1) throw new Error(`Épreuve « Tirage de camion » : ${eps.length} trouvée(s), 1 attendue.`);
  const ep = eps[0];

  const tous = await db
    .select({
      id: passage.id,
      dossard: athlete.dossard,
      nom: athlete.nom,
      statut: passage.statut,
      resultatStatut: passage.resultatStatut,
      valeur: passage.valeur,
      tempsS: passage.tempsS,
      tours: passage.tours,
      chronoS: passage.chronoS,
      valideLe: passage.valideLe,
    })
    .from(passage)
    .innerJoin(athlete, eq(athlete.id, passage.athleteId))
    .where(and(eq(passage.epreuveId, ep.id), eq(passage.competitionId, comp.id)))
    .orderBy(asc(athlete.dossard));

  const okZero = tous.filter(
    (p) => p.statut === "termine" && p.resultatStatut === "ok" && Number(p.valeur) === 0,
  );
  const dossard6 = tous.filter((p) => p.statut === "a_saisir" && p.dossard === 6);
  const horsCible = tous.filter(
    (p) => p.statut === "termine" && p.resultatStatut === "ok" && Number(p.valeur) !== 0,
  );

  console.log(`Compétition : ${comp.nom}\nÉpreuve : ${ep.nom} — ${tous.length} passages`);
  const cible = [...okZero, ...dossard6];
  for (const p of cible)
    console.log(
      `  dossard ${String(p.dossard ?? "—").padStart(2)}  ${p.nom.padEnd(18)} ${p.statut} · ${p.resultatStatut ?? "sans verdict"} · valeur ${p.valeur} · temps ${p.tempsS}  →  ZÉRO`,
    );
  console.log(`Laissés tels quels : ${tous.length - cible.length} (forfaits et autres).`);

  if (okZero.length !== 21 || dossard6.length !== 1 || horsCible.length !== 0)
    throw new Error(
      `Cible inattendue : ${okZero.length} « ok · 0 » (21 attendus), ${dossard6.length} dossard 6 en attente (1 attendu), ${horsCible.length} performance(s) non nulle(s) (0 attendue). Rien n'a été écrit.`,
    );

  if (!ECRIRE) {
    console.log("\nÀ blanc : rien n'a été écrit. Relancer avec --ecrire.");
    return;
  }

  await db.transaction(async (tx) => {
    const maintenant = new Date();
    const ecrits = await tx
      .update(passage)
      .set({
        statut: "termine",
        resultatStatut: "zero",
        valeur: null,
        tempsS: null,
        tours: [],
        chronoS: null,
        valideLe: maintenant,
      })
      .where(and(eq(passage.epreuveId, ep.id), inArray(passage.id, cible.map((p) => p.id))))
      .returning({ id: passage.id });
    if (ecrits.length !== cible.length)
      throw new Error(`${ecrits.length} lignes écrites pour ${cible.length} attendues : transaction annulée.`);
    await tx.insert(journal).values(
      cible.map((p) => ({
        competitionId: comp.id,
        action: "passage.epreuve_annulee",
        cibleTable: "passage",
        cibleId: p.id,
        details: JSON.stringify({
          motif: "Épreuve « Tirage de camion » annulée : « 0 » saisi comme performance, converti en verdict ZÉRO à la demande du directeur.",
          ancienResultat: {
            statut: p.statut,
            verdict: p.resultatStatut,
            valeur: p.valeur,
            tempsS: p.tempsS,
            tours: p.tours,
            chronoS: p.chronoS,
            valideLe: p.valideLe,
          },
          nouveauResultat: { statut: "termine", verdict: "zero" },
        }),
        origine: "script annuler-epreuve-camion",
      })),
    );
  });
  console.log(`\nÉcrit : ${cible.length} passages en verdict ZÉRO, ${cible.length} lignes au journal d'audit.`);
}

principal()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("ARRÊT :", (e as Error).message);
    process.exit(1);
  });
