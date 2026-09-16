"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { seConnecter, type EtatConnexion } from "./actions";

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-encre px-4 py-3 font-titre text-base font-semibold uppercase tracking-wide text-papier transition hover:bg-vert-fonce disabled:opacity-50"
    >
      {pending ? "Vérification…" : "Entrer"}
    </button>
  );
}

export function FormulaireConnexion({ suite }: { suite?: string }) {
  const [etat, action] = useActionState<EtatConnexion, FormData>(seConnecter, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suite" value={suite ?? "/admin"} />

      <div>
        <label
          htmlFor="motdepasse"
          className="mb-1.5 block text-sm font-medium text-encre-2"
        >
          Code d&apos;accès
        </label>
        <input
          id="motdepasse"
          name="motdepasse"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="w-full rounded-lg border border-bordure-2 bg-papier px-3 py-2.5 text-base outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
      </div>

      {etat.erreur && (
        // `role=alert` : le message est annoncé même si l'officiel a le regard
        // sur le plateau et non sur l'écran.
        <p
          role="alert"
          className="rounded-lg bg-rouge/10 px-3 py-2.5 text-sm text-rouge-fonce"
        >
          {etat.erreur}
        </p>
      )}

      <Bouton />
    </form>
  );
}
