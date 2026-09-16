"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { choisirEpreuve } from "@/lib/actions";

interface Item {
  id: string;
  nom: string;
}

export function SelecteurEpreuve({
  competitionId,
  epreuves,
  categories,
  epreuveId,
  categorieId,
}: {
  competitionId: string;
  epreuves: Item[];
  categories: Item[];
  epreuveId: string;
  categorieId: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();

  /**
   * Le choix est écrit en base, pas seulement dans l'URL : c'est lui qui dit
   * au mur LED quelle épreuve afficher. Un changement local à l'écran de
   * saisie laisserait le public sur l'épreuve précédente.
   */
  function choisir(nouvelleEpreuve: string, nouvelleCategorie: string) {
    demarrer(async () => {
      await choisirEpreuve(competitionId, nouvelleEpreuve, nouvelleCategorie);
      router.push(
        `/admin/plateau?epreuve=${nouvelleEpreuve}&categorie=${nouvelleCategorie}`,
      );
    });
  }

  const style =
    "rounded-lg border border-bordure-2 bg-white px-3 py-2 text-sm outline-none focus:border-orange";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-bordure bg-white p-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-encre-2">
          Épreuve en cours
        </span>
        <select
          value={epreuveId}
          disabled={enCours}
          onChange={(e) => choisir(e.target.value, categorieId)}
          className={style}
        >
          {epreuves.map((e, i) => (
            <option key={e.id} value={e.id}>
              {i + 1}. {e.nom}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-encre-2">
          Catégorie
        </span>
        <select
          value={categorieId}
          disabled={enCours}
          onChange={(e) => choisir(epreuveId, e.target.value)}
          className={style}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>

      <p className="ml-auto max-w-xs text-xs text-encre-3">
        Ce choix pilote aussi les écrans du public.
      </p>
    </div>
  );
}
