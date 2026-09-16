import Link from "next/link";
import { competitionCourante } from "@/lib/donnees";
import { seDeconnecter } from "../connexion/actions";

/**
 * Rien n'est prérendu sous `/admin`.
 *
 * Sans cela, Next fige ces pages au moment du build : la table de marque
 * verrait la liste des athlètes telle qu'elle était à la compilation, et une
 * pesée validée n'apparaîtrait jamais. Sur un outil qui suit une compétition
 * en direct, la fraîcheur prime sur la vitesse de rendu.
 */
export const dynamic = "force-dynamic";

const ONGLETS = [
  { href: "/admin", libelle: "Accueil" },
  { href: "/admin/athletes", libelle: "Athlètes" },
  { href: "/admin/plateau", libelle: "Plateau" },
  { href: "/admin/classement", libelle: "Classement" },
];

export default async function LayoutAdmin({
  children,
}: LayoutProps<"/admin">) {
  const comp = await competitionCourante();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-bordure bg-vert-fonce text-papier">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-titre text-lg font-bold tracking-wide uppercase">
            Strongman 2026
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {ONGLETS.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="opacity-80 transition hover:opacity-100"
              >
                {o.libelle}
              </Link>
            ))}
          </nav>
          <form action={seDeconnecter} className="ml-auto">
            <button
              type="submit"
              className="text-sm opacity-70 underline transition hover:opacity-100"
            >
              Quitter
            </button>
          </form>
        </div>
      </header>

      {/* Une compétition suspendue doit se voir depuis n'importe quel écran :
          c'est l'information qui conditionne toutes les autres. */}
      {comp?.suspendue && (
        <div
          role="status"
          className="bg-rouge px-4 py-2.5 text-center text-sm font-medium text-white"
        >
          Compétition suspendue — {comp.motifSuspension}
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
