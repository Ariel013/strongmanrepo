import Link from "next/link";
import { competitionCourante } from "@/lib/donnees";

/** La page lit la compétition en base : elle ne doit pas être figée au build. */
export const dynamic = "force-dynamic";

export default async function Accueil() {
  const comp = await competitionCourante();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-10">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-vert-fonce">
          <span className="font-titre text-2xl font-bold text-papier">SM</span>
        </div>
        <h1 className="font-titre text-3xl font-bold tracking-tight uppercase">
          {comp?.nom ?? "Arbitrage Strongman 2026"}
        </h1>
        <p className="mt-1 text-encre-3">
          {comp?.lieu ? `${comp.lieu} — ` : ""}Fédération Ivoirienne de
          Bodybuilding, Dynamophilie et Assimilés
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin"
          className="rounded-xl border border-bordure bg-white p-4 transition hover:border-encre"
        >
          <span className="font-titre text-base font-semibold uppercase">
            Administration
          </span>
          <span className="mt-1 block text-sm text-encre-2">
            Table de marque — code d&apos;accès requis
          </span>
        </Link>

        <Link
          href="/ecran/classement"
          className="rounded-xl border border-bordure bg-white p-4 transition hover:border-encre"
        >
          <span className="font-titre text-base font-semibold uppercase">
            Écrans du public
          </span>
          <span className="mt-1 block text-sm text-encre-2">
            Classement, plateau, podium
          </span>
        </Link>

        <Link
          href="/aide"
          className="rounded-xl border border-bordure bg-white p-4 transition hover:border-encre"
        >
          <span className="font-titre text-base font-semibold uppercase">
            Mode d&apos;emploi
          </span>
          <span className="mt-1 block text-sm text-encre-2">
            Comment utiliser le logiciel
          </span>
        </Link>
      </div>
    </main>
  );
}
