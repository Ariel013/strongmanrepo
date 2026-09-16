import { Suspense } from "react";
import { FormulaireConnexion } from "./formulaire";

export const metadata = {
  title: "Connexion — Arbitrage Strongman",
};

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-vert-fonce">
            <span className="font-titre text-3xl font-bold tracking-tight text-papier">
              SM
            </span>
          </div>
          <h1 className="font-titre text-3xl font-bold tracking-tight uppercase">
            Arbitrage Strongman
          </h1>
          <p className="mt-1 text-sm text-encre-3">
            Championnat National 2026 — FIBDA
          </p>
        </div>

        <div className="rounded-xl border border-bordure bg-white p-6 shadow-sm">
          <h2 className="font-titre text-lg font-semibold uppercase">
            Accès à l&apos;administration
          </h2>
          <p className="mt-1 mb-5 text-sm text-encre-2">
            Réservé à la table de marque. Les écrans du public et le mode
            d&apos;emploi restent accessibles sans code.
          </p>

          <Suspense>
            <FormulaireConnexion suite={suite} />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-encre-3">
          <a href="/aide" className="underline hover:text-encre">
            Mode d&apos;emploi
          </a>
        </p>
      </div>
    </main>
  );
}
