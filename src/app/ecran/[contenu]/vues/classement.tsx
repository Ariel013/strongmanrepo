/**
 * Le classement général, une colonne par catégorie. Jamais fusionné :
 * les catégories ne concourent pas l'une contre l'autre.
 */

import { C, nomComplet } from "@/lib/charte";
import {
  tableauGeneral,
  tousLesResultats,
  type AthletePublic,
  type CategorieVue,
  type EpreuveVue,
} from "@/lib/donnees";
import { Commun, VignetteEcran } from "../commun";

export async function VueClassement({
  t,
  couleurDe,
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
          fontSize: "3.6vh",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: "2vh",
          flex: "none",
        }}
      >
        Classement général par catégorie
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
          const lignes = tableauGeneral(
            cat,
            epreuves,
            athletes,
            resultats,
          ).lignes.slice(0, 10);
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
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "2.8vh",
                        fontWeight: 600,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {nomComplet(a)}
                    </div>
                    <div
                      style={{
                        fontSize: "3vh",
                        fontWeight: 700,
                        flex: "none",
                      }}
                    >
                      {l.total}
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
                  Aucun résultat validé.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
