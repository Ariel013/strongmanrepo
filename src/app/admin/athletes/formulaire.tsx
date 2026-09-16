"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { enregistrerAthlete, type Retour } from "@/lib/actions";

interface Cat {
  id: string;
  nom: string;
}

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-encre px-4 py-2 font-titre text-sm font-semibold uppercase tracking-wide text-papier transition hover:bg-vert-fonce disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : "Ajouter"}
    </button>
  );
}

const champ =
  "w-full rounded-lg border border-bordure-2 bg-papier px-2.5 py-2 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20";

export function FormulaireAthlete({
  competitionId,
  categories,
}: {
  competitionId: string;
  categories: Cat[];
}) {
  const [etat, action] = useActionState<Retour, FormData>(enregistrerAthlete, {
    ok: false,
  });
  const form = useRef<HTMLFormElement>(null);

  // Le formulaire se vide après un succès : la table de marque enchaîne les
  // saisies, et un champ resté rempli produit un doublon au coup suivant.
  useEffect(() => {
    if (etat.ok) form.current?.reset();
  }, [etat]);

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="competitionId" value={competitionId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Nom *
          </span>
          <input name="nom" required className={champ} autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Prénoms
          </span>
          <input name="prenoms" className={champ} autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Club
          </span>
          <input name="club" className={champ} autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Dossard
          </span>
          <input
            name="dossard"
            type="number"
            min="1"
            className={champ}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Poids de corps (kg)
          </span>
          <input
            name="poidsCorps"
            // `inputMode=decimal` ouvre le pavé numérique sur tablette, et la
            // virgule est acceptée à la saisie : « 104,5 » est la façon dont
            // un officiel écrit un poids.
            inputMode="decimal"
            placeholder="104,5"
            className={champ}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Catégorie
          </span>
          <select name="categorieId" className={champ} defaultValue="">
            <option value="">— à définir —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-encre-2">
            Nationalité
          </span>
          <input
            name="pays"
            defaultValue="CIV"
            maxLength={3}
            className={champ}
            autoComplete="off"
          />
        </label>
        <label className="flex items-center gap-2 pt-5 text-sm">
          <input
            name="horsClassement"
            type="checkbox"
            className="h-4 w-4 accent-orange"
          />
          <span>Hors classement</span>
        </label>
      </div>

      {etat.erreur && (
        <p
          role="alert"
          className="rounded-lg bg-rouge/10 px-3 py-2 text-sm text-rouge-fonce"
        >
          {etat.erreur}
        </p>
      )}

      <Bouton />
    </form>
  );
}
