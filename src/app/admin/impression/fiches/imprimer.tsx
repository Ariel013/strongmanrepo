"use client";

import { styleBouton } from "@/components/ui";

/**
 * Le bouton d'impression. `window.print()` n'existe que côté navigateur, d'où
 * ce composant client minuscule au milieu d'une page servie par le serveur.
 */
export function BoutonImprimer({ nombre }: { nombre: number }) {
  return (
    <button
      type="button"
      title="Ouvre la boîte d'impression du navigateur — choisissez A4, portrait"
      onClick={() => window.print()}
      style={styleBouton("vert", { padding: "11px 18px" })}
    >
      Imprimer {nombre === 1 ? "la fiche" : `les ${nombre} fiches`}
    </button>
  );
}
