"use client";

import { useEffect, useState } from "react";
import { C, mmss } from "@/lib/charte";
import { ChiffresStables } from "@/components/chiffres";

/**
 * Le chronomètre du mur LED.
 *
 * Il ne reçoit du serveur que l'instant de départ et le décompte préparé, et
 * calcule tout le reste lui-même, dix fois par seconde. C'est indispensable :
 * la page ne se rafraîchit que toutes les deux secondes, et un compteur qui
 * sauterait de deux en deux secondes serait inutilisable pour le public comme
 * pour l'athlète.
 *
 * Les alertes visuelles sont celles du fichier d'origine : flash orange à
 * chaque demi-minute écoulée, rouge clignotant sur les trente dernières
 * secondes.
 */
export function Chrono({
  phase,
  debutLe,
  dureeS,
  arretS,
  encreNormale,
  second,
  taille,
  tailleLibelle,
  libelleArrete,
}: {
  phase: string;
  /** Horodatage du départ, en millisecondes. */
  debutLe: number | null;
  dureeS: number;
  arretS: number | null;
  encreNormale: string;
  second: string;
  taille: string;
  tailleLibelle: string;
  /** Ce qui s'affiche sous le compteur quand rien ne tourne. */
  libelleArrete: string;
}) {
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "encours") return;
    const t = setInterval(() => setMaintenant(Date.now()), 100);
    return () => clearInterval(t);
  }, [phase]);

  let reste: number;
  if (phase === "encours" && debutLe !== null) {
    const ecoule = (maintenant - debutLe) / 1000;
    reste = dureeS > 0 ? Math.max(0, dureeS - ecoule) : ecoule;
  } else if (phase === "arrete") {
    reste = arretS ?? 0;
  } else {
    reste = dureeS > 0 ? dureeS : 0;
  }

  const passe = dureeS > 0 ? dureeS - reste : reste;
  const finale = phase === "encours" && dureeS > 0 && reste <= 30;
  const flash =
    phase === "encours" && !finale && passe >= 29 && Math.floor(passe) % 30 < 2;

  const couleur = finale ? "#FF4A2E" : flash ? C.orangeClair : encreNormale;

  const libelle =
    phase === "encours"
      ? dureeS > 0
        ? "Temps restant"
        : "Temps écoulé"
      : phase === "arrete"
        ? "Temps arrêté"
        : libelleArrete;

  return (
    <>
      <div
        style={{
          fontSize: taille,
          fontWeight: 700,
          lineHeight: 0.9,
          whiteSpace: "nowrap",
          color: couleur,
          animation:
            finale || flash ? "clignote .6s steps(1,end) infinite" : "none",
        }}
      >
        <ChiffresStables texte={mmss(reste)} />
      </div>
      <div
        style={{ fontSize: tailleLibelle, color: second, marginTop: "1vh" }}
      >
        {libelle}
      </div>
    </>
  );
}
