/**
 * Le classement des clubs — les rangs finaux de toutes les catégories
 * retenues, cumulés par club selon le barème 15 / 10 / 5 / 4 / 3 / 1.
 */

import { C, POINTS_CLUB_LISIBLE } from "@/lib/charte";
import {
  tableauClubs,
  tousLesResultats,
  type AthletePublic,
  type CategorieVue,
  type EpreuveVue,
} from "@/lib/donnees";
import { Commun } from "../commun";

export async function VueClubs({
  t,
  logos,
  categories,
  epreuves,
  athletes,
  competitionId,
}: Commun & {
  categories: CategorieVue[];
  epreuves: EpreuveVue[];
  athletes: AthletePublic[];
  competitionId: string;
}) {
  const resultats = await tousLesResultats(competitionId, epreuves);
  const lignes = tableauClubs(categories, epreuves, athletes, resultats).slice(0, 12);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "2vw",
          marginBottom: "2vh",
          flex: "none",
        }}
      >
        <div style={{ fontSize: "3.6vh", fontWeight: 700, textTransform: "uppercase" }}>
          Classement des clubs
        </div>
        <div style={{ fontSize: "2vh", color: t.second }}>{POINTS_CLUB_LISIBLE}</div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: lignes.length > 6 ? "1fr 1fr" : "1fr",
          gap: "0 2vw",
          alignContent: "start",
          overflow: "hidden",
        }}
      >
        {lignes.map((l, i) => {
          const logo = logos.get(l.club);
          return (
            <div
              key={l.club}
              style={{
                display: "flex",
                gap: "1.2vw",
                alignItems: "center",
                padding: "1.1vh 1.2vw",
                borderTop: `1px solid ${t.bord}`,
                background: i === 0 ? t.carte : "transparent",
              }}
            >
              <div style={{ width: "3.5vw", fontSize: "3.4vh", fontWeight: 700, color: C.orange, flex: "none" }}>
                {i + 1}
              </div>
              <div
                style={{
                  width: "6vh",
                  height: "6vh",
                  borderRadius: "1vh",
                  border: `1px solid ${t.bord}`,
                  backgroundColor: t.carte,
                  backgroundImage: logo ? `url("${logo}")` : "none",
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  flex: "none",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "3vh", fontWeight: 700, lineHeight: 1.1, overflowWrap: "anywhere" }}>
                  {l.club}
                </div>
                <div style={{ fontSize: "1.9vh", color: t.second }}>
                  {l.athletes} athlète{l.athletes > 1 ? "s" : ""} classé{l.athletes > 1 ? "s" : ""}
                  {l.places[0] > 0 ? ` · ${l.places[0]} titre${l.places[0] > 1 ? "s" : ""}` : ""}
                </div>
              </div>
              <div style={{ fontSize: "3.4vh", fontWeight: 700, flex: "none" }}>
                {l.points}
              </div>
            </div>
          );
        })}
        {lignes.length === 0 ? (
          <div style={{ padding: "1.4vh 1.2vw", fontSize: "2.4vh", color: t.second }}>
            Aucun résultat validé : le classement des clubs se remplit au fil des épreuves.
          </div>
        ) : null}
      </div>
    </div>
  );
}
