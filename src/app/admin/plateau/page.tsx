import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesDe,
  ordrePour,
  passagesDe,
} from "@/lib/donnees";
import { SelecteurEpreuve } from "./selecteur";
import { Plateau } from "./plateau";

export default async function PagePlateau({
  searchParams,
}: {
  searchParams: Promise<{ epreuve?: string; categorie?: string }>;
}) {
  const comp = await competitionCourante();
  if (!comp) return <p>Aucune compétition installée.</p>;

  const [epreuves, categories, athletes] = await Promise.all([
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);

  const { epreuve: epreuveQ, categorie: categorieQ } = await searchParams;

  // L'épreuve et la catégorie choisies ici pilotent aussi le mur LED : on
  // retombe sur celles enregistrées en base, puis sur la première du
  // programme, pour qu'un écran public ne soit jamais vide par défaut.
  const epreuveCourante =
    epreuves.find((e) => e.id === epreuveQ) ??
    epreuves.find((e) => e.id === comp.epreuveCouranteId) ??
    epreuves[0];
  const categorieCourante =
    categories.find((c) => c.id === categorieQ) ??
    categories.find((c) => c.id === comp.categorieCouranteId) ??
    categories[0];

  if (!epreuveCourante || !categorieCourante) {
    return (
      <p className="rounded-xl border border-bordure bg-white p-6 text-encre-2">
        Il faut au moins une épreuve et une catégorie pour ouvrir le plateau.
      </p>
    );
  }

  const duGroupe = athletes.filter(
    (a) => a.categorieId === categorieCourante.id,
  );
  const [ordre, passages] = await Promise.all([
    ordrePour(epreuveCourante, categorieCourante.id, epreuves, athletes),
    passagesDe(
      epreuveCourante.id,
      duGroupe.map((a) => a.id),
    ),
  ]);

  const indexEpreuve = epreuves.findIndex((e) => e.id === epreuveCourante.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-titre text-2xl font-bold tracking-tight uppercase">
          Plateau
        </h1>
        <p className="mt-1 text-sm text-encre-3">
          {indexEpreuve === 0
            ? "Première épreuve : l'ordre de passage suit les dossards croissants."
            : "L'ordre de passage va du moins de points au plus de points — le leader passe en dernier."}
        </p>
      </div>

      <SelecteurEpreuve
        competitionId={comp.id}
        epreuves={epreuves.map((e) => ({ id: e.id, nom: e.nom }))}
        categories={categories.map((c) => ({ id: c.id, nom: c.nom }))}
        epreuveId={epreuveCourante.id}
        categorieId={categorieCourante.id}
      />

      <Plateau
        competitionId={comp.id}
        epreuve={epreuveCourante}
        categorieNom={categorieCourante.nom}
        athletes={duGroupe}
        ordre={ordre.map((a) => a.id)}
        passages={passages}
      />
    </div>
  );
}
