"use client";

/**
 * Le seul composant client commun à tous les écrans du mur LED.
 *
 * Un écran de diffusion n'est jamais touché par personne : s'il ne se met pas
 * à jour tout seul, il affiche une compétition figée sans que quiconque s'en
 * aperçoive. Deux mécanismes se relaient pour que cela n'arrive pas.
 *
 * 1. **L'empreinte.** Toutes les deux secondes, on demande à
 *    `/api/ecran/etat` une chaîne qui résume ce qui fait bouger l'affichage —
 *    l'athlète au plateau, le chronomètre, la file, l'épreuve courante. Le
 *    rendu complet n'est redemandé que si elle a changé. Entre deux passages,
 *    l'écran ne coûte donc qu'une requête minuscule, là où il recalculait
 *    auparavant tous les classements trente fois par minute.
 *
 * 2. **Le filet.** Toutes les trente secondes, la page est rafraîchie quoi
 *    qu'il arrive. L'empreinte ne couvre pas les retouches rares — un nom
 *    corrigé, une photo déposée pendant l'épreuve — et un écran qui les
 *    ignorerait jusqu'au passage suivant serait pire que lent : il serait
 *    faux. Trente secondes bornent cette dérive.
 *
 * Le chronomètre et le compte à rebours, eux, ne dépendent d'aucun des deux :
 * ils tournent dans le navigateur à partir de l'instant de départ.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Période d'interrogation de l'empreinte, en millisecondes. */
const PERIODE_MS = 2000;
/** Rafraîchissement complet imposé, quoi qu'en dise l'empreinte. */
const FILET_MS = 30000;

export default function Rafraichir() {
  const routeur = useRouter();
  const empreinte = useRef<string | null>(null);
  const dernierRendu = useRef(0);

  useEffect(() => {
    let vivant = true;
    // L'horloge se lit dans l'effet, pas pendant le rendu : le rendu doit
    // rester reproductible.
    dernierRendu.current = Date.now();

    // Un tour ne commence qu'à la fin du précédent : un serveur qui met dix
    // secondes à répondre ne reçoit pas cinq requêtes empilées par écran.
    // Et une requête qui traîne est abandonnée avant le tour suivant.
    let minuterie: ReturnType<typeof setTimeout> | null = null;
    const armer = () => {
      if (!vivant) return;
      minuterie = setTimeout(tour, PERIODE_MS);
    };
    const tour = async () => {
      if (!vivant) return;
      const forcer = Date.now() - dernierRendu.current >= FILET_MS;

      if (!forcer) {
        try {
          const r = await fetch("/api/ecran/etat", {
            cache: "no-store",
            signal: AbortSignal.timeout(1500),
          });
          if (!vivant) return;
          const { signature } = (await r.json()) as { signature: string };

          // Première lecture : on mémorise sans rafraîchir, la page vient
          // d'être rendue.
          if (empreinte.current === null) {
            empreinte.current = signature;
            armer();
            return;
          }
          if (signature === empreinte.current) {
            armer();
            return;
          }
          empreinte.current = signature;
        } catch {
          // Réseau coupé ou serveur muet : on ne force rien ici. Le filet
          // s'en chargera, et un écran qui garde sa dernière image reste plus
          // utile qu'un écran qui clignote.
          armer();
          return;
        }
      }

      dernierRendu.current = Date.now();
      routeur.refresh();
      armer();
    };
    armer();

    return () => {
      vivant = false;
      if (minuterie) clearTimeout(minuterie);
    };
  }, [routeur]);

  // Rien à peindre : ce composant n'existe que pour son effet.
  return null;
}
