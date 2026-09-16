import {
  athletesDe,
  categoriesDe,
  competitionCourante,
} from "@/lib/donnees";
import { FormulaireAthlete } from "./formulaire";
import { LigneAthlete } from "./ligne";

export default async function PageAthletes() {
  const comp = await competitionCourante();
  if (!comp) return <p>Aucune compétition installée.</p>;

  const [athletes, categories] = await Promise.all([
    athletesDe(comp.id),
    categoriesDe(comp.id),
  ]);

  const peses = athletes.filter((a) => a.peseeValidee).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-titre text-2xl font-bold tracking-tight uppercase">
          Athlètes
        </h1>
        <p className="text-sm text-encre-3">
          {athletes.length} inscrit(s) · {peses} pesée(s) validée(s)
        </p>
      </div>

      <section className="rounded-xl border border-bordure bg-white p-4">
        <h2 className="mb-3 font-titre text-base font-semibold uppercase">
          Ajouter un athlète
        </h2>
        <FormulaireAthlete
          competitionId={comp.id}
          categories={categories.map((c) => ({ id: c.id, nom: c.nom }))}
        />
      </section>

      {athletes.length === 0 ? (
        // Un tableau vide sans explication se lit comme une panne.
        <p className="rounded-xl border border-dashed border-bordure-2 bg-papier-2 px-4 py-8 text-center text-sm text-encre-2">
          Aucun athlète pour l&apos;instant. Ajoutez le premier avec le
          formulaire ci-dessus : son dossard servira à fixer l&apos;ordre de
          passage de la première épreuve.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bordure bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-bordure bg-papier-2 text-left text-xs uppercase tracking-wide text-encre-3">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Dossard</th>
                <th className="px-3 py-2.5 font-semibold">Nom et prénoms</th>
                <th className="px-3 py-2.5 font-semibold">Club</th>
                <th className="px-3 py-2.5 font-semibold">Poids</th>
                <th className="px-3 py-2.5 font-semibold">Catégorie</th>
                <th className="px-3 py-2.5 font-semibold">Pesée</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {athletes.map((a) => (
                <LigneAthlete
                  key={a.id}
                  athlete={a}
                  categories={categories.map((c) => ({ id: c.id, nom: c.nom }))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
