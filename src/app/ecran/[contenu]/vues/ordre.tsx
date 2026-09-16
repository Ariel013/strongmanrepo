/**
 * L'ordre de passage à venir — en colonnes par catégorie quand le passage
 * est mélangé, en liste unique sinon.
 */

import { C, clubAffiche, nomComplet } from "@/lib/charte";
import type { CategorieVue, PassageVue } from "@/lib/donnees";
import { Commun, VignetteEcran } from "../commun";

export function VueOrdre({
  t,
  parId,
  couleurDe,
  nomCat,
  nomEpreuve,
  avenir,
  melange,
  categories,
}: Commun & {
  avenir: PassageVue[];
  melange: boolean;
  categories: CategorieVue[];
}) {
  if (melange) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "2vh",
        }}
      >
        <div
          style={{
            fontSize: "3.4vh",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Ordre de passage — {nomEpreuve}
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(22vw,1fr))",
            gap: "1.6vw",
            overflow: "hidden",
          }}
        >
          {categories.map((cat) => {
            const couleur = couleurDe(cat.id);
            const liste = avenir.filter(
              (p) => parId.get(p.athleteId)?.categorieId === cat.id,
            );
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
                    padding: "1.4vh 1.2vw",
                    background: couleur,
                    color: C.blanc,
                    fontSize: "3.2vh",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    lineHeight: 1.1,
                  }}
                >
                  {cat.nom}
                </div>
                {liste.map((p) => {
                  const a = parId.get(p.athleteId);
                  if (!a) return null;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        gap: "1.2vw",
                        alignItems: "center",
                        padding: "1vh 1.2vw",
                        borderTop: `1px solid ${t.bord}`,
                      }}
                    >
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
                          width: "3.4vw",
                          fontSize: "3.2vh",
                          fontWeight: 700,
                          color: couleur,
                          flex: "none",
                        }}
                      >
                        {a.dossard ?? "—"}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: "3vh",
                          fontWeight: 600,
                          lineHeight: 1.15,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {nomComplet(a)}
                      </div>
                    </div>
                  );
                })}
                {liste.length === 0 ? (
                  <div
                    style={{
                      padding: "1.4vh 1.2vw",
                      fontSize: "2.2vh",
                      color: t.second,
                    }}
                  >
                    Catégorie terminée
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div
        style={{
          fontSize: "4vh",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: "2vh",
        }}
      >
        Ordre de passage — {nomEpreuve}
      </div>
      {avenir.map((p) => {
        const a = parId.get(p.athleteId);
        if (!a) return null;
        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              gap: "2vw",
              alignItems: "center",
              padding: "1.2vh 0",
              borderBottom: `1px solid ${t.bord}`,
            }}
          >
            <VignetteEcran
              t={t}
              a={a}
              largeur="6vh"
              hauteur="7.4vh"
              taille="2.4vh"
            />
            <div
              style={{
                width: "6vw",
                fontSize: "4.2vh",
                fontWeight: 700,
                color: C.orange,
              }}
            >
              {a.dossard ?? "—"}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: "4.2vh",
                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {nomComplet(a)}
            </div>
            <div
              style={{
                display: "inline-flex",
                padding: "0.3vh 1vw",
                borderRadius: "0.6vh",
                background: couleurDe(a.categorieId),
                color: C.blanc,
                fontSize: "2vh",
                fontWeight: 700,
                textTransform: "uppercase",
                flex: "none",
              }}
            >
              {nomCat(a.categorieId)}
            </div>
            <div
              style={{ fontSize: "2.6vh", color: t.second, flex: "none" }}
            >
              {clubAffiche(a.club)}
            </div>
          </div>
        );
      })}
      {avenir.length === 0 ? (
        <div style={{ fontSize: "3vh", color: t.second }}>
          Plus aucun passage en attente sur cette épreuve.
        </div>
      ) : null}
    </div>
  );
}
