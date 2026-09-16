/**
 * L'athlète au plateau — la vue maîtresse du mur LED.
 *
 * Trois états : plateau vide (prochain passage annoncé), un seul athlète, ou
 * l'appel en duo quand le passage est mélangé.
 */

import {
  C,
  clubAffiche,
  nomComplet,
  pays,
  virgule,
} from "@/lib/charte";
import type { AthletePublic, CategorieVue, PassageVue } from "@/lib/donnees";
import { Chrono } from "../chrono";
import {
  DrapeauEcran,
  Message,
  VignetteEcran,
  type Commun,
  type Palette,
} from "../commun";

export function VuePlateau({
  t,
  parId,
  couleurDe,
  nomCat,
  logos,
  niveaux,
  aNiveau,
  nomEpreuve,
  nomGroupe,
  comp,
  auPlateau,
  avenir,
  melange,
  categories,
}: Commun & {
  comp: {
    chronoPhase: string;
    chronoDebutLe: Date | null;
    chronoDureeS: number;
    chronoArretS: number | null;
  };
  auPlateau: PassageVue[];
  avenir: PassageVue[];
  melange: boolean;
  categories: CategorieVue[];
}) {
  const chrono = (taille: string, tailleLibelle: string) => (
    <Chrono
      phase={comp.chronoPhase}
      debutLe={comp.chronoDebutLe ? comp.chronoDebutLe.getTime() : null}
      dureeS={comp.chronoDureeS}
      arretS={comp.chronoArretS}
      encreNormale={t.encre}
      second={t.second}
      taille={taille}
      tailleLibelle={tailleLibelle}
      libelleArrete={`Prêt — ${nomGroupe}`}
    />
  );

  /* ── Plateau vide : le prochain passage, ou l'épreuve terminée ── */
  if (auPlateau.length === 0) {
    const prochain = avenir[0];
    const a = prochain ? parId.get(prochain.athleteId) : undefined;
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
          style={{
            fontSize: "2.4vh",
            fontWeight: 600,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: C.orange,
          }}
        >
          {nomEpreuve} · {nomGroupe}
        </div>
        {!a ? (
          <div>
            <div style={{ fontSize: "8vh", fontWeight: 700, lineHeight: 1.05 }}>
              Épreuve terminée
            </div>
            <div
              style={{ fontSize: "3vh", color: t.second, marginTop: "1vh" }}
            >
              Résultats en cours de vérification
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "2.2vh",
                fontWeight: 600,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: t.second,
              }}
            >
              Prochain passage
            </div>
            <div
              style={{
                display: "flex",
                gap: "2.5vw",
                alignItems: "center",
                marginTop: "2vh",
              }}
            >
              {a.photoUrl ? (
                <VignetteEcran
                  t={t}
                  a={a}
                  largeur="14vw"
                  hauteur="17vw"
                  taille="6vh"
                />
              ) : null}
              <div
                style={{
                  fontSize: "9vh",
                  fontWeight: 700,
                  color: C.orange,
                  lineHeight: 1,
                }}
              >
                {a.dossard ?? "—"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "0.5vh 1.2vw",
                    borderRadius: "0.8vh",
                    background: couleurDe(a.categorieId),
                    color: C.blanc,
                    fontSize: "2.6vh",
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    marginBottom: "1vh",
                  }}
                >
                  {nomCat(a.categorieId)}
                </div>
                <div
                  style={{ fontSize: "8vh", fontWeight: 700, lineHeight: 1.02 }}
                >
                  {nomComplet(a)}
                </div>
                <div style={{ fontSize: "3vh", color: t.second }}>
                  {clubAffiche(a.club)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Un seul athlète au plateau ── */
  if (auPlateau.length === 1) {
    const a = parId.get(auPlateau[0].athleteId);
    if (!a) return <Message t={t} texte="Athlète introuvable" />;
    const pa = pays(a.pays);
    const logo = logos.get((a.club ?? "").trim());

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "2vh",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "1.5vw",
            alignItems: "stretch",
            flex: "none",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: "1.2vw",
              padding: "1.2vh 1.6vw",
              borderRadius: "1vh",
              background: couleurDe(a.categorieId),
              color: C.blanc,
            }}
          >
            <div
              style={{
                fontSize: "1.8vh",
                fontWeight: 600,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                opacity: 0.85,
                flex: "none",
              }}
            >
              Catégorie
            </div>
            <div
              style={{
                fontSize: "4.2vh",
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: ".02em",
                textTransform: "uppercase",
              }}
            >
              {nomCat(a.categorieId)}
            </div>
          </div>
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              padding: "1.2vh 1.6vw",
              borderRadius: "1vh",
              background: t.carte,
              border: `1px solid ${t.bord}`,
              fontSize: "2.6vh",
              fontWeight: 600,
              color: C.orange,
            }}
          >
            {nomEpreuve}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            gap: "2.5vw",
            alignItems: "center",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <VignetteEcran
            t={t}
            a={a}
            largeur="19vw"
            hauteur="52vh"
            taille="9vh"
          />
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: "1.5vw",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "1.2vh",
              }}
            >
              <span
                style={{
                  padding: "0.5vh 1.4vw",
                  borderRadius: "1vh",
                  background: C.orange,
                  color: C.blanc,
                  fontSize: "3.6vh",
                  fontWeight: 700,
                }}
              >
                {a.dossard ?? "—"}
              </span>
              <DrapeauEcran couleurs={pa.c} largeur="4.4vw" hauteur="2.8vh" />
              <span
                style={{
                  fontSize: "2.8vh",
                  fontWeight: 600,
                  color: t.encre,
                }}
              >
                {pa.n}
              </span>
              <span
                style={{
                  padding: "0.4vh 1.2vw",
                  borderRadius: "0.8vh",
                  background: t.carte,
                  border: `1px solid ${t.bord}`,
                  fontSize: "2.8vh",
                  fontWeight: 700,
                  color: C.orange,
                }}
              >
                {a.poidsCorps === null
                  ? "Non pesé"
                  : `${virgule(a.poidsCorps)} kg`}
              </span>
              {aNiveau ? (
                <span
                  style={{
                    padding: "0.4vh 1.2vw",
                    borderRadius: "0.8vh",
                    background: C.orange,
                    color: C.blanc,
                    fontSize: "2.8vh",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {niveaux[a.id] ?? "Niveau non déclaré"}
                </span>
              ) : null}
              {a.horsClassement ? (
                <span style={{ fontSize: "2.4vh", color: t.second }}>
                  Invité — hors classement
                </span>
              ) : null}
            </div>
            <div
              style={{
                fontSize: "7vh",
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: "-.01em",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {nomComplet(a)}
            </div>
            <div
              style={{
                display: "flex",
                gap: "1.2vw",
                alignItems: "center",
                marginTop: "1.2vh",
              }}
            >
              {logo ? (
                <div
                  style={{
                    width: "6vh",
                    height: "6vh",
                    borderRadius: "0.8vh",
                    backgroundColor: C.blanc,
                    backgroundImage: `url("${logo}")`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    flex: "none",
                  }}
                />
              ) : null}
              <div
                style={{
                  fontSize: "3.2vh",
                  color: t.second,
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {clubAffiche(a.club)}
              </div>
            </div>
          </div>
          <div
            style={{
              flex: "0 0 auto",
              width: "max-content",
              textAlign: "center",
            }}
          >
            {chrono("16vh", "2.2vh")}
          </div>
        </div>

        {melange ? (
          <AppelParCategorie
            t={t}
            parId={parId}
            couleurDe={couleurDe}
            categories={categories}
            avenir={avenir}
          />
        ) : null}
      </div>
    );
  }

  /* ── Deux athlètes ou plus : l'appel en duo ── */
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "1.6vh",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2vw",
          flex: "none",
        }}
      >
        <div
          style={{
            fontSize: "2.6vh",
            fontWeight: 600,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: C.orange,
          }}
        >
          {nomEpreuve}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "baseline",
            gap: "1.2vw",
            flex: "0 0 auto",
          }}
        >
          {chrono("11vh", "2.2vh")}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "stretch",
          gap: "1.6vw",
          minHeight: 0,
        }}
      >
        {auPlateau.slice(0, 2).map((p, i) => {
          const a = parId.get(p.athleteId);
          if (!a) return null;
          const pa = pays(a.pays);
          return (
            <div
              key={p.id}
              style={{
                display: "contents",
              }}
            >
              {i === 1 ? (
                <div
                  style={{
                    flex: "none",
                    display: "flex",
                    width: "1.5vw",
                    alignSelf: "stretch",
                    borderRadius: "0.4vh",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ flex: 1, background: C.orange }} />
                  <div style={{ flex: 1, background: C.blanc }} />
                  <div style={{ flex: 1, background: C.vert }} />
                </div>
              ) : null}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.4vh",
                }}
              >
                <div
                  style={{
                    padding: "1.1vh 1.4vw",
                    borderRadius: "1vh",
                    background: couleurDe(a.categorieId),
                    color: C.blanc,
                    fontSize: "3.6vh",
                    fontWeight: 700,
                    letterSpacing: ".02em",
                    textTransform: "uppercase",
                    lineHeight: 1.05,
                  }}
                >
                  {nomCat(a.categorieId)}
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    gap: "1.4vw",
                    alignItems: "center",
                    minHeight: 0,
                  }}
                >
                  <VignetteEcran
                    t={t}
                    a={a}
                    largeur="13vw"
                    hauteur="36vh"
                    taille="6vh"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "1vw",
                        alignItems: "center",
                        marginBottom: "0.8vh",
                      }}
                    >
                      <span
                        style={{
                          padding: "0.4vh 1.1vw",
                          borderRadius: "0.8vh",
                          background: C.orange,
                          color: C.blanc,
                          fontSize: "3vh",
                          fontWeight: 700,
                        }}
                      >
                        {a.dossard ?? "—"}
                      </span>
                      <DrapeauEcran
                        couleurs={pa.c}
                        largeur="3.6vw"
                        hauteur="2.4vh"
                      />
                      <span
                        style={{
                          fontSize: "2.4vh",
                          fontWeight: 600,
                          color: t.encre,
                        }}
                      >
                        {pa.n}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "5.4vh",
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: "-.01em",
                      }}
                    >
                      {nomComplet(a)}
                    </div>
                    <div
                      style={{
                        fontSize: "2.6vh",
                        color: t.second,
                        marginTop: "0.6vh",
                      }}
                    >
                      {clubAffiche(a.club)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "1vw",
                        flexWrap: "wrap",
                        marginTop: "1vh",
                      }}
                    >
                      <div
                        style={{
                          padding: "0.4vh 1.1vw",
                          borderRadius: "0.8vh",
                          background: t.carte,
                          border: `1px solid ${t.bord}`,
                          fontSize: "2.8vh",
                          fontWeight: 700,
                          color: C.orange,
                        }}
                      >
                        {a.poidsCorps === null
                          ? "Non pesé"
                          : `${virgule(a.poidsCorps)} kg`}
                      </div>
                      {aNiveau ? (
                        <div
                          style={{
                            padding: "0.4vh 1.1vw",
                            borderRadius: "0.8vh",
                            background: C.orange,
                            color: C.blanc,
                            fontSize: "2.8vh",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {niveaux[a.id] ?? "Niveau non déclaré"}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Le bandeau « un athlète par catégorie », sous le plateau mélangé. */
function AppelParCategorie({
  t,
  parId,
  couleurDe,
  categories,
  avenir,
}: {
  t: Palette;
  parId: Map<string, AthletePublic>;
  couleurDe: (categorieId: string | null) => string;
  categories: CategorieVue[];
  avenir: PassageVue[];
}) {
  return (
    <div style={{ flex: "none" }}>
      <div
        style={{
          fontSize: "1.8vh",
          fontWeight: 600,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: t.second,
          marginBottom: "1vh",
        }}
      >
        Appel — un athlète par catégorie
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(20vw,1fr))",
          gap: "1.4vw",
        }}
      >
        {categories.map((cat) => {
          const p = avenir.find(
            (x) => parId.get(x.athleteId)?.categorieId === cat.id,
          );
          const a = p ? parId.get(p.athleteId) : undefined;
          const couleur = couleurDe(cat.id);
          return (
            <div
              key={cat.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.2vw",
                borderRadius: "1vh",
                background: t.carte,
                border: `1px solid ${t.bord}`,
                borderLeft: `0.7vw solid ${couleur}`,
                padding: "1.2vh 1.4vw",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "3.6vh",
                  fontWeight: 700,
                  color: couleur,
                  flex: "none",
                }}
              >
                {a?.dossard ?? "—"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "1.7vh",
                    fontWeight: 600,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: t.second,
                  }}
                >
                  {cat.nom}
                </div>
                <div
                  style={{
                    fontSize: "3.2vh",
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  {a ? nomComplet(a) : "Catégorie terminée"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
