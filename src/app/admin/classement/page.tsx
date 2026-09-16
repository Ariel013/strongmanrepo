import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesDe,
  tableauGeneral,
} from "@/lib/donnees";

export default async function PageClassement() {
  const comp = await competitionCourante();
  if (!comp) return <p>Aucune compétition installée.</p>;

  const [epreuves, categories, athletes] = await Promise.all([
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);

  const parId = new Map(athletes.map((a) => [a.id, a]));
  const tableaux = await Promise.all(
    categories
      .filter((c) => c.active)
      .map((c) => tableauGeneral(c, epreuves, athletes)),
  );

  const medaille = (rang: number) =>
    rang === 1
      ? "text-or"
      : rang === 2
        ? "text-argent"
        : rang === 3
          ? "text-bronze"
          : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-titre text-2xl font-bold tracking-tight uppercase">
          Classement général
        </h1>
        <a
          href="/api/admin/export"
          className="rounded-lg bg-encre px-4 py-2 font-titre text-sm font-semibold uppercase tracking-wide text-papier transition hover:bg-vert-fonce"
        >
          Télécharger le classeur
        </a>
      </div>

      <p className="text-sm text-encre-2">
        Les points sont recalculés à chaque affichage :{" "}
        <strong>Points = effectif classable − rang + 1</strong>. Retirer un
        athlète change donc les points de toute sa catégorie — c&apos;est
        normal.
      </p>

      {tableaux.map((t) => (
        <section
          key={t.categorie.id}
          className="overflow-hidden rounded-xl border border-bordure bg-white"
        >
          <h2 className="border-b border-bordure bg-papier-2 px-4 py-2.5 font-titre text-base font-semibold uppercase">
            {t.categorie.nom}
          </h2>

          {t.lignes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-encre-3">
              Aucun athlète classable dans cette catégorie.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-bordure text-left text-xs uppercase tracking-wide text-encre-3">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Rang</th>
                    <th className="px-3 py-2 font-semibold">Dossard</th>
                    <th className="px-3 py-2 font-semibold">Athlète</th>
                    {epreuves.map((e) => (
                      <th
                        key={e.id}
                        className="px-2 py-2 text-center font-semibold"
                        // Le nom complet reste accessible au survol : les
                        // colonnes sont trop étroites pour l'afficher entier.
                        title={e.nom}
                      >
                        {e.nom.slice(0, 8)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bordure">
                  {t.lignes.map((l) => {
                    const a = parId.get(l.athleteId);
                    return (
                      <tr key={l.athleteId}>
                        <td
                          className={`px-3 py-2 font-titre text-lg font-bold tabular-nums ${medaille(l.rang)}`}
                        >
                          {l.rang}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {a?.dossard ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{a?.nom}</span>{" "}
                          <span className="text-encre-2">{a?.prenoms}</span>
                        </td>
                        {epreuves.map((e) => (
                          <td
                            key={e.id}
                            className="px-2 py-2 text-center tabular-nums text-encre-2"
                          >
                            {t.parEpreuve.get(e.id)?.get(l.athleteId) ?? 0}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-bold tabular-nums">
                          {l.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
