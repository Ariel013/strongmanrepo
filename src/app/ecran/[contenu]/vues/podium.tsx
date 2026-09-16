/**
 * Le podium et son palmarès — titres, primes et lots saisis à
 * l'étape Programme.
 */

import { C, METAUX, couleurMetal, nomComplet } from "@/lib/charte";
import {
  recompensesDe,
  tableauGeneral,
  tousLesResultats,
  type AthletePublic,
  type CategorieVue,
  type EpreuveVue,
} from "@/lib/donnees";
import { Commun, Message, VignetteEcran } from "../commun";

export async function VuePodium({
  t,
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
  const [resultats, recompenses] = await Promise.all([
    tousLesResultats(competitionId, epreuves),
    recompensesDe(competitionId),
  ]);
  const parId = new Map(athletes.map((a) => [a.id, a]));
  const cat = categories[0];

  if (!cat) return <Message t={t} texte="Aucune catégorie retenue" />;

  const podium = tableauGeneral(cat, epreuves, athletes, resultats).lignes.slice(
    0,
    3,
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "2vh",
      }}
    >
      <div
        style={{ fontSize: "4vh", fontWeight: 700, textTransform: "uppercase" }}
      >
        Podium — {cat.nom}
      </div>
      {podium.map((l, i) => {
        const a = parId.get(l.athleteId);
        if (!a) return null;
        const couleur = couleurMetal(i);
        const r = recompenses[i];
        return (
          <div
            key={l.athleteId}
            style={{
              display: "flex",
              gap: "2vw",
              alignItems: "center",
              padding: "2vh 2vw",
              borderRadius: "1vh",
              background: t.carte,
              border: `1px solid ${t.bord}`,
              borderLeft: `0.8vw solid ${couleur}`,
            }}
          >
            <div
              style={{
                fontSize: "6vh",
                fontWeight: 700,
                color: couleur,
                width: "5vw",
              }}
            >
              {l.rang}
            </div>
            <VignetteEcran
              t={t}
              a={a}
              largeur="9vh"
              hauteur="11vh"
              taille="3vh"
              fond={t.fond}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: "5vh", fontWeight: 700, lineHeight: 1.1 }}
              >
                {nomComplet(a)}
              </div>
              <div style={{ fontSize: "2.4vh", color: t.second }}>
                {r?.titre || METAUX[i] || ""} · {l.total} points
              </div>
            </div>
            <div
              style={{ fontSize: "3.4vh", fontWeight: 700, color: C.orange }}
            >
              {r?.prime ?? ""}
            </div>
          </div>
        );
      })}
      {podium.length === 0 ? (
        <div style={{ fontSize: "3vh", color: t.second }}>
          Aucun athlète classé dans cette catégorie.
        </div>
      ) : null}
    </div>
  );
}
