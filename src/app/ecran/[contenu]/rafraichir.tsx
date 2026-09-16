"use client";

/**
 * Le seul composant client du mur LED.
 *
 * Un écran de diffusion n'est jamais touché par personne : s'il ne se met pas
 * à jour tout seul, il affiche une compétition figée sans que quiconque s'en
 * aperçoive. `router.refresh()` redemande le rendu serveur de la page toutes
 * les deux secondes ; combiné à `revalidate = 2`, cela suffit à suivre le
 * plateau sans marteler la base.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Période de rafraîchissement, en millisecondes. */
const PERIODE_MS = 2000;

export default function Rafraichir() {
  const routeur = useRouter();

  useEffect(() => {
    const minuterie = setInterval(() => {
      routeur.refresh();
    }, PERIODE_MS);
    return () => clearInterval(minuterie);
  }, [routeur]);

  // Rien à peindre : ce composant n'existe que pour son effet.
  return null;
}
