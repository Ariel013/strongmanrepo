"use client";

import { useEffect } from "react";

/**
 * Frontière d'erreur du mur LED.
 *
 * Sans elle, une base qui ne répond pas deux secondes remplace l'écran par la
 * page d'erreur générique de Next — en anglais, et sans que rien ne relance
 * jamais l'affichage, puisque le composant de rafraîchissement tombe avec la
 * page. Ici : un message qui dit ce qu'il attend, et une nouvelle tentative
 * toutes les cinq secondes, sans intervention en régie.
 */
export default function ErreurEcran({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const t = setTimeout(reset, 5000);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0A0D0B",
        color: "#FCFAF6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2vh",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "4vw",
      }}
    >
      <div style={{ fontSize: "5vh", fontWeight: 700, textTransform: "uppercase" }}>
        Données momentanément indisponibles
      </div>
      <div style={{ fontSize: "2.6vh", color: "#9AA79E", maxWidth: "70vw", lineHeight: 1.4 }}>
        L&apos;écran retente tout seul dans cinq secondes. Si le message
        reste, la table vérifie la connexion du serveur : rien n&apos;est perdu,
        la compétition continue sur le plateau.
      </div>
    </div>
  );
}
