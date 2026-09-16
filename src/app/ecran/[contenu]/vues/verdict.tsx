/**
 * Le dernier verdict officialisé, en très grand : c'est ce que le public
 * regarde juste après un essai.
 */

import { C, nomComplet, uniteCourte, virgule } from "@/lib/charte";
import type { PassageVue } from "@/lib/donnees";
import { Commun, Message } from "../commun";

export function VueVerdict({
  t,
  parId,
  nomEpreuve,
  nomGroupe,
  passages,
  mesure,
}: Commun & { passages: PassageVue[]; mesure: string | null }) {
  const dernier = passages
    .filter((p) => p.statut === "termine" && p.valideLe)
    .sort((a, b) => b.valideLe!.getTime() - a.valideLe!.getTime())[0];

  if (!dernier) {
    return (
      <Message
        t={t}
        texte="Aucun verdict"
        detail="Le premier passage validé s'affichera ici."
      />
    );
  }

  const a = parId.get(dernier.athleteId);
  const texte =
    dernier.resultatStatut === "zero"
      ? "ZÉRO"
      : dernier.resultatStatut === "forfait"
        ? "FORFAIT"
        : `${virgule(dernier.valeur)}${uniteCourte(mesure)}`;
  const couleur =
    dernier.resultatStatut === "forfait"
      ? C.rouge
      : dernier.resultatStatut === "zero"
        ? C.rougeFonce
        : C.orange;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "2.4vh",
          fontWeight: 600,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: t.second,
        }}
      >
        Dernier verdict officialisé
      </div>
      <div
        style={{
          fontSize: "8vh",
          fontWeight: 700,
          marginTop: "2vh",
          lineHeight: 1.05,
        }}
      >
        {a ? nomComplet(a) : "—"}
      </div>
      <div
        style={{
          fontSize: "14vh",
          fontWeight: 700,
          lineHeight: 1,
          color: couleur,
        }}
      >
        {texte}
      </div>
      <div
        style={{ fontSize: "3vh", color: t.second, marginTop: "1vh" }}
      >
        {nomEpreuve} · {nomGroupe}
      </div>
    </div>
  );
}
