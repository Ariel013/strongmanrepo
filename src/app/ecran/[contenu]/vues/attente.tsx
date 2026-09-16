/**
 * L'écran d'attente : compte à rebours, informations pratiques, bandeau
 * partenaires et liste défilante des engagés.
 */

import { C } from "@/lib/charte";
import type { AthletePublic } from "@/lib/donnees";
import { Compteur } from "../compteur";
import { Engages } from "../engages";
import type { Palette } from "../commun";

export function VueAttente({
  t,
  comp,
  athletes,
}: {
  t: Palette;
  comp: {
    debutLe: Date | null;
    finLe: Date | null;
    lieu: string | null;
    adresse: string | null;
    partenaires: string | null;
  };
  athletes: AthletePublic[];
}) {
  const engages = athletes.filter((a) => a.dossard !== null);

  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const heure = (d: Date | null) =>
    d
      ? d
          .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          .replace(":", "h")
      : "";

  return (
    <div style={{ flex: 1, display: "flex", gap: "3vw", minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Compteur cible={comp.debutLe ? comp.debutLe.getTime() : null} />
        <div
          style={{
            fontSize: "5vh",
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: "1vh",
            textTransform: "capitalize",
          }}
        >
          {dateTexte}
        </div>
        <div
          style={{
            fontSize: "4vh",
            fontWeight: 600,
            color: C.vert,
            marginTop: "1vh",
          }}
        >
          {heure(comp.debutLe)} → {heure(comp.finLe)}
        </div>
        <div
          style={{ fontSize: "3vh", color: t.second, marginTop: "2vh" }}
        >
          {comp.lieu ?? ""}
        </div>
        <div style={{ fontSize: "2.4vh", color: t.second }}>
          {comp.adresse ?? ""}
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: "2.2vh",
            color: t.second,
            paddingTop: "3vh",
          }}
        >
          {comp.partenaires ?? ""}
        </div>
      </div>

      <div
        style={{
          width: "42vw",
          flex: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Engages
          athletes={engages}
          second={t.second}
          bord={t.bord}
          carte={t.carte}
        />
      </div>
    </div>
  );
}
