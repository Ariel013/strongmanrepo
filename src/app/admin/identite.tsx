"use client";

import { useState, useTransition } from "react";
import { C } from "@/lib/charte";
import { Etiquette, styleChamp } from "@/components/ui";
import { enregistrerIdentite } from "@/lib/actions";

/**
 * Les deux cartes d'identité de l'accueil : date et horaires, lieu.
 *
 * Les cinq champs partent ensemble parce que la date et les deux heures ne
 * font qu'une seule donnée en base : « Samedi 19 Septembre 2026 » + « 14h00 »
 * donne l'ouverture, la même date + « 23h00 » donne la clôture. Les
 * enregistrer séparément laisserait la base un instant dans un état que
 * personne n'a voulu.
 */
export function CartesIdentite({
  competitionId,
  initial,
}: {
  competitionId: string;
  initial: {
    date: string;
    heure: string;
    fin: string;
    lieu: string;
    adresse: string;
  };
}) {
  const [v, setV] = useState(initial);
  const [, demarrer] = useTransition();

  const pousser = () => {
    demarrer(async () => void (await enregistrerIdentite(competitionId, v)));
  };

  const champ = (
    cle: keyof typeof v,
    style: React.CSSProperties,
    title: string,
  ) => (
    <input
      value={v[cle]}
      title={title}
      onChange={(e) => setV({ ...v, [cle]: e.target.value })}
      onBlur={pousser}
      style={styleChamp(style)}
    />
  );

  const carte: React.CSSProperties = {
    background: C.blanc,
    border: `1px solid ${C.bordure}`,
    borderRadius: 14,
    padding: "18px 20px",
  };

  return (
    <>
      <div style={carte}>
        <Etiquette>Date et horaires</Etiquette>
        {champ(
          "date",
          { padding: "7px 9px", fontSize: 16, fontWeight: 600 },
          "Date officielle, reprise sur les écrans publics et les impressions",
        )}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
            alignItems: "center",
          }}
        >
          {champ(
            "heure",
            {
              flex: 1,
              minWidth: 0,
              width: "auto",
              padding: "7px 9px",
              fontWeight: 600,
              color: C.vertFonce,
            },
            "Heure d'ouverture",
          )}
          <span style={{ fontSize: 13, color: C.encre4, flex: "none" }}>→</span>
          {champ(
            "fin",
            {
              flex: 1,
              minWidth: 0,
              width: "auto",
              padding: "7px 9px",
              fontWeight: 600,
              color: C.vertFonce,
            },
            "Heure de clôture prévue",
          )}
        </div>
      </div>

      <div style={carte}>
        <Etiquette>Lieu</Etiquette>
        {champ(
          "lieu",
          { padding: "7px 9px", fontSize: 16, fontWeight: 600 },
          "Site de la compétition",
        )}
        <div style={{ marginTop: 8 }}>
          {champ(
            "adresse",
            { padding: "7px 9px", fontSize: 13, color: C.encre3 },
            "Adresse complète",
          )}
        </div>
      </div>
    </>
  );
}
