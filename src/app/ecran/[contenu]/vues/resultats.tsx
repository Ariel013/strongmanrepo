/**
 * Les résultats de l'épreuve en cours, une colonne par catégorie.
 *
 * Ce que la régie diffuse quand l'épreuve est finie : le rang, la
 * performance et les points de chacun. Recalculé à chaque rendu depuis les
 * passages validés — un passage en attente de résultat n'y figure pas.
 */

import { C, nomComplet, performanceLisible } from "@/lib/charte";
import {
  tableauEpreuve,
  tousLesResultats,
  type AthletePublic,
  type CategorieVue,
  type EpreuveVue,
} from "@/lib/donnees";
import { Commun, VignetteEcran } from "../commun";

export async function VueResultats({
  t,
  couleurDe,
  nomEpreuve,
  epreuve,
  categories,
  epreuves,
  athletes,
  competitionId,
  restants,
}: Commun & {
  epreuve: EpreuveVue | null;
  categories: CategorieVue[];
  epreuves: EpreuveVue[];
  athletes: AthletePublic[];
  competitionId: string;
  /** Passages pas encore validés sur l'épreuve : dit si le tableau est définitif. */
  restants: number;
}) {
  const resultats = await tousLesResultats(competitionId, epreuves);
  const parId = new Map(athletes.map((a) => [a.id, a]));

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
        <div
          style={{
            fontSize: "3.6vh",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Résultats · {nomEpreuve}
        </div>
        <div
          style={{
            fontSize: "2.2vh",
            fontWeight: 600,
            color: restants === 0 ? C.vert : t.second,
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          {restants === 0
            ? "Résultats définitifs"
            : `Provisoires · ${restants} passage${restants > 1 ? "s" : ""} à venir`}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(24vw,1fr))",
          gap: "1.6vw",
          overflow: "hidden",
        }}
      >
        {categories.map((cat) => {
          const couleur = couleurDe(cat.id);
          const lignes = epreuve
            ? tableauEpreuve(epreuve, cat.id, athletes, resultats)
                .lignes.filter((l) => l.rang !== null)
                .sort((a, b) => a.rang! - b.rang!)
                .slice(0, 10)
            : [];
          return (
            <div
              key={cat.id}
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                borderRadius: "1vh",
                background: t.carte,
                border: `1px solid ${t.bord}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1.2vh 1.2vw",
                  background: couleur,
                  color: C.blanc,
                  fontSize: "3vh",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".03em",
                  lineHeight: 1.1,
                  flex: "none",
                }}
              >
                {cat.nom}
              </div>
              {lignes.map((l) => {
                const a = parId.get(l.athleteId);
                if (!a) return null;
                return (
                  <div
                    key={l.athleteId}
                    style={{
                      display: "flex",
                      gap: "1.2vw",
                      alignItems: "center",
                      padding: "0.9vh 1.2vw",
                      borderTop: `1px solid ${t.bord}`,
                    }}
                  >
                    <div
                      style={{
                        width: "3vw",
                        fontSize: "3vh",
                        fontWeight: 700,
                        color: couleur,
                        flex: "none",
                      }}
                    >
                      {l.rang}
                    </div>
                    <VignetteEcran
                      t={t}
                      a={a}
                      largeur="4.6vh"
                      hauteur="5.6vh"
                      taille="1.8vh"
                      fond={t.fond}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "2.8vh",
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                          lineHeight: 1.1,
                        }}
                      >
                        {nomComplet(a)}
                      </div>
                      <div style={{ fontSize: "2vh", color: t.second }}>
                        {performanceLisible(
                          epreuve?.mesure,
                          l.resultat?.valeur ?? null,
                          l.resultat?.temps ?? null,
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "3vh",
                        fontWeight: 700,
                        flex: "none",
                      }}
                    >
                      {l.points}
                    </div>
                  </div>
                );
              })}
              {lignes.length === 0 ? (
                <div
                  style={{
                    padding: "1.4vh 1.2vw",
                    fontSize: "2.2vh",
                    color: t.second,
                  }}
                >
                  Aucun résultat validé pour cette épreuve.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
