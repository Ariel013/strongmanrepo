import Link from "next/link";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesDe,
} from "@/lib/donnees";

export default async function PageAdmin() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <p className="rounded-lg border border-bordure bg-white p-6 text-encre-2">
        Aucune compétition installée. Lancez{" "}
        <code className="rounded bg-papier-2 px-1.5 py-0.5">pnpm run db:seed</code>{" "}
        pour créer celle du 19 septembre 2026.
      </p>
    );
  }

  const [athletes, epreuves, categories] = await Promise.all([
    athletesDe(comp.id),
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
  ]);

  const peses = athletes.filter((a) => a.peseeValidee).length;
  const classes = athletes.filter(
    (a) => !a.horsClassement && a.categorieId,
  ).length;
  const sansCategorie = athletes.filter((a) => !a.categorieId).length;

  /**
   * Chaque ligne dit ce qui manque et emmène à l'écran qui le corrige. Un
   * état d'avancement qui ne mène nulle part oblige à chercher soi-même.
   */
  const controles = [
    {
      fait: athletes.length >= 2,
      titre: "Athlètes engagés",
      detail: `${athletes.length} inscrit(s)`,
      lien: "/admin/athletes",
    },
    {
      fait: athletes.length > 0 && peses === athletes.length,
      titre: "Pesées validées",
      detail: `${peses} / ${athletes.length}`,
      lien: "/admin/athletes",
    },
    {
      fait: athletes.length > 0 && sansCategorie === 0,
      titre: "Catégories affectées",
      detail:
        sansCategorie === 0
          ? `${classes} athlète(s) classé(s)`
          : `${sansCategorie} sans catégorie`,
      lien: "/admin/athletes",
    },
    {
      fait: epreuves.length > 0,
      titre: "Épreuves au programme",
      detail: `${epreuves.length} épreuve(s)`,
      lien: "/admin/plateau",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-titre text-2xl font-bold tracking-tight uppercase">
          {comp.nom}
        </h1>
        <p className="mt-1 text-sm text-encre-3">
          {comp.lieu}
          {comp.adresse ? ` — ${comp.adresse}` : ""}
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-titre text-lg font-semibold uppercase">
          Avant de commencer
        </h2>
        <ul className="divide-y divide-bordure overflow-hidden rounded-xl border border-bordure bg-white">
          {controles.map((c) => (
            <li key={c.titre}>
              <Link
                href={c.lien}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-papier-2"
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    c.fait ? "bg-vert" : "bg-orange"
                  }`}
                >
                  {c.fait ? "✓" : "!"}
                </span>
                <span className="font-medium">{c.titre}</span>
                <span className="ml-auto text-sm text-encre-3">{c.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-titre text-lg font-semibold uppercase">
          Écrans du public
        </h2>
        <p className="mb-3 text-sm text-encre-2">
          Ouvrez ces adresses en plein écran sur le mur LED. Elles se mettent à
          jour toutes seules et ne demandent aucun code.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["plateau", "Athlète au plateau"],
            ["ordre", "Ordre de passage"],
            ["classement", "Classement"],
            ["podium", "Podium"],
            ["attente", "Écran d'attente"],
          ].map(([cle, libelle]) => (
            <a
              key={cle}
              href={`/ecran/${cle}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-bordure-2 bg-white px-3 py-2 text-sm transition hover:border-encre"
            >
              {libelle}
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-titre text-lg font-semibold uppercase">
          Catégories
        </h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-bordure bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium">{c.nom}</span>
              <span className="ml-2 text-encre-3">
                {athletes.filter((a) => a.categorieId === c.id).length} athlète(s)
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
