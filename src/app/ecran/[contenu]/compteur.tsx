"use client";

import { useEffect, useState } from "react";

const p2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * Le compte à rebours de l'écran d'attente.
 *
 * Il tourne dans le navigateur plutôt que d'être rendu côté serveur : un
 * compteur figé entre deux rafraîchissements donne l'impression d'un écran
 * planté, ce qui est exactement ce que le public regarde avant l'ouverture.
 */
export function Compteur({
  cible,
}: {
  /** Horodatage du coup d'envoi, en millisecondes. `null` si inconnu. */
  cible: number | null;
}) {
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  let texte = "—";
  let libelle = "Coup d'envoi";

  if (cible !== null) {
    const reste = cible - maintenant;
    if (reste > 0) {
      const j = Math.floor(reste / 86400000);
      const hh = Math.floor((reste % 86400000) / 3600000);
      const mm = Math.floor((reste % 3600000) / 60000);
      const ss = Math.floor((reste % 60000) / 1000);
      texte =
        j > 0
          ? `${j}j ${p2(hh)}h ${p2(mm)}min`
          : `${p2(hh)}:${p2(mm)}:${p2(ss)}`;
      libelle = j > 0 ? "Avant le coup d'envoi" : "Coup d'envoi dans";
    } else {
      texte = "En cours";
      libelle = "Championnat";
    }
  }

  return (
    <>
      <div
        style={{
          fontSize: "2.4vh",
          fontWeight: 600,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: "#EC6D23",
        }}
      >
        {libelle}
      </div>
      <div
        style={{
          fontSize: "12vh",
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {texte}
      </div>
    </>
  );
}
