import { C, couleurCategorie } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart } from "@/components/ui";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  niveauxPour,
  ordrePour,
  passagesDe,
  tableauEpreuve,
  tableauGeneral,
  tousLesResultats,
  type EpreuveVue,
} from "@/lib/donnees";
import { versMesure } from "@/lib/classement";
import { Plateau, type CategoriePlateau } from "./plateau";

/**
 * Le plateau — la vue « estPlateau » du logiciel d'origine.
 *
 * L'épreuve et la catégorie courantes vivent en base, pas seulement dans
 * l'URL : ce sont elles qui pilotent le mur LED. Un régisseur qui ouvre
 * `/ecran/plateau` sur une autre machine doit voir ce que la table a choisi.
 */
export const dynamic = "force-dynamic";

/** La pseudo-catégorie « tout le monde mélangé » du sélecteur de passage. */
const TOUS = "tous";

export default async function PagePlateau({
  searchParams,
}: {
  searchParams: Promise<{ epreuve?: string; categorie?: string }>;
}) {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Plateau</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuves, categoriesToutes, athletes] = await Promise.all([
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);
  const categories = categoriesToutes.filter((c) => c.active);

  const { epreuve: epreuveQ, categorie: categorieQ } = await searchParams;

  const epreuveCourante =
    epreuves.find((e) => e.id === epreuveQ) ??
    epreuves.find((e) => e.id === comp.epreuveCouranteId) ??
    epreuves[0];

  if (!epreuveCourante || categories.length === 0) {
    return (
      <>
        <FilAriane>Plateau</FilAriane>
        <Encart ton="ambre">
          Il faut au moins une épreuve et une catégorie retenue pour ouvrir le
          plateau. Complétez les étapes 1 et 2 de la préparation.
        </Encart>
      </>
    );
  }

  /**
   * Le passage « mélangé » est une propriété de l'épreuve, mais la table peut
   * la contredire ponctuellement depuis le sélecteur : l'URL l'emporte.
   */
  const demande = categorieQ ?? comp.categorieCouranteId ?? undefined;
  const groupeCourantId =
    demande === TOUS
      ? TOUS
      : (categories.find((c) => c.id === demande)?.id ??
        (epreuveCourante.passage === "melange" ? TOUS : categories[0].id));
  const melange = groupeCourantId === TOUS;

  /** Les catégories effectivement au plateau : une seule, ou toutes. */
  const enJeu = melange
    ? categories
    : categories.filter((c) => c.id === groupeCourantId);

  const concernes = athletes.filter((a) =>
    enJeu.some((c) => c.id === a.categorieId),
  );

  const vuePublique: EpreuveVue[] = epreuves.map((e) => ({
    id: e.id,
    nom: e.nom,
    mesure: versMesure(e.mesure),
    tempsLimiteS: e.tempsLimiteS,
    essais: e.essais,
    critere: e.critere,
    position: e.position,
  }));

  const [resultats, passages] = await Promise.all([
    tousLesResultats(comp.id, vuePublique),
    passagesDe(
      epreuveCourante.id,
      concernes.map((a) => a.id),
    ),
  ]);

  /**
   * Un bloc par catégorie en jeu : son ordre de passage théorique, sa
   * couleur, son classement d'épreuve. Les classements restent séparés par
   * catégorie même quand le passage est mélangé — c'est le passage qui
   * change, jamais le barème.
   */
  const parCategorie: CategoriePlateau[] = enJeu.map((cat) => {
    const rang = categoriesToutes.findIndex((c) => c.id === cat.id);
    const ordre = ordrePour(
      vuePublique.find((e) => e.id === epreuveCourante.id)!,
      cat.id,
      vuePublique,
      athletes,
      resultats,
    );
    const tEpreuve = tableauEpreuve(
      vuePublique.find((e) => e.id === epreuveCourante.id)!,
      cat.id,
      athletes,
      resultats,
    );
    const tGeneral = tableauGeneral(cat, vuePublique, athletes, resultats);

    return {
      id: cat.id,
      nom: cat.nom,
      couleur: couleurCategorie(rang),
      ordre: ordre.map((a) => a.id),
      classementEpreuve: tEpreuve.lignes
        .filter((l) => l.rang !== null)
        .map((l) => ({
          rang: l.rang!,
          athleteId: l.athleteId,
          points: l.points,
          valeur: l.resultat?.valeur ?? null,
          temps: l.resultat?.temps ?? null,
        })),
      classementGeneral: tGeneral.lignes.map((l) => ({
        rang: l.rang,
        athleteId: l.athleteId,
        total: l.total,
      })),
    };
  });

  const index = epreuves.findIndex((e) => e.id === epreuveCourante.id);

  return (
    <>
      <FilAriane>
        Plateau · {epreuveCourante.nom} ·{" "}
        {melange
          ? "Toutes catégories mélangées"
          : (enJeu[0]?.nom ?? "—")}
      </FilAriane>

      <div
        style={{
          fontSize: 13,
          color: C.encre4,
          lineHeight: 1.45,
          marginBottom: 14,
        }}
      >
        {index === 0
          ? "Première épreuve : l'ordre de passage suit les dossards croissants."
          : "L'ordre de passage va du moins de points au plus de points — le leader ferme la marche."}
      </div>

      <Plateau
        competitionId={comp.id}
        epreuve={{
          id: epreuveCourante.id,
          nom: epreuveCourante.nom,
          mesure: versMesure(epreuveCourante.mesure),
          tempsLimiteS: epreuveCourante.tempsLimiteS,
          critere: epreuveCourante.critere,
          niveau: epreuveCourante.niveau,
          tours: epreuveCourante.tours,
          ateliers: epreuveCourante.ateliers,
          distanceTotale: epreuveCourante.distanceTotale,
        }}
        epreuves={epreuves.map((e) => ({ id: e.id, nom: e.nom }))}
        categories={categories.map((c, i) => ({
          id: c.id,
          nom: c.nom,
          couleur: couleurCategorie(
            categoriesToutes.findIndex((x) => x.id === c.id),
          ),
          ordre: i,
        }))}
        groupeCourantId={groupeCourantId}
        melange={melange}
        parCategorie={parCategorie}
        athletes={concernes}
        niveaux={await niveauxPour(comp.id, epreuveCourante.id)}
        passages={passages}
        suspendue={comp.suspendue}
        motifSuspension={comp.motifSuspension}
      />
    </>
  );
}
