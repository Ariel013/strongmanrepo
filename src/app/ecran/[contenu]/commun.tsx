/**
 * Briques communes aux écrans du mur LED : le cadre plein écran, le message
 * pleine page, la vignette photo et le drapeau.
 *
 * Elles sont sorties des vues parce que les sept écrans les partagent : un
 * cadre qui diverge d'un écran à l'autre se voit immédiatement quand deux
 * murs LED sont côte à côte.
 */

import { C, initiales, theme } from "@/lib/charte";
import type { AthletePublic } from "@/lib/donnees";
import Rafraichir from "./rafraichir";

export type Palette = ReturnType<typeof theme>;

/** Ce que toutes les vues reçoivent de la page. */
export interface Commun {
  t: Palette;
  parId: Map<string, AthletePublic>;
  couleurDe: (categorieId: string | null) => string;
  nomCat: (categorieId: string | null) => string;
  logos: Map<string, string>;
  niveaux: Record<string, string>;
  aNiveau: boolean;
  nomEpreuve: string;
  nomGroupe: string;
}

export function Cadre({
  t,
  apercu,
  children,
}: {
  t: Palette;
  apercu: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      className="mur-led"
      style={{
        position: "fixed",
        inset: 0,
        padding: "3vh 4vw",
        background: t.fond,
        color: t.encre,
        display: "flex",
        flexDirection: "column",
        gap: "2vh",
      }}
    >
      <Rafraichir />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5vw",
          flex: "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fibda.jpg"
          alt="FIBDA"
          style={{
            height: "6vh",
            width: "auto",
            objectFit: "contain",
            background: C.papier,
            borderRadius: 6,
            padding: 3,
          }}
        />
        <div
          style={{
            fontSize: "1.6vh",
            fontWeight: 600,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: C.orange,
          }}
        >
          Championnat National de Strongman 2026
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "1vw",
            alignItems: "center",
          }}
        >
          {apercu ? (
            <a
              href="/admin/regie"
              style={{
                padding: "0.9vh 1.6vw",
                borderRadius: "0.8vh",
                border: "1px solid rgba(154,167,158,.5)",
                background: "transparent",
                color: t.second,
                fontSize: "1.8vh",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← Fermer l&apos;aperçu
            </a>
          ) : null}
          <div
            style={{
              display: "flex",
              height: "0.8vh",
              width: "14vw",
              overflow: "hidden",
              borderRadius: 2,
            }}
          >
            <div style={{ flex: 1, background: C.orange }} />
            <div style={{ flex: 1, background: C.blanc }} />
            <div style={{ flex: 1, background: C.vert }} />
          </div>
        </div>
      </div>
      {children}
    </main>
  );
}

/** Message plein cadre — panne de données, attente, écran sans contenu. */
export function Message({
  t,
  texte,
  detail,
}: {
  t: Palette;
  texte: string;
  detail?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "8vh", fontWeight: 700, lineHeight: 1.05 }}>
        {texte}
      </div>
      {detail ? (
        <div
          style={{ fontSize: "3vh", color: t.second, marginTop: "1vh" }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

/** La vignette photo, déclinée aux proportions du mur LED. */
export function VignetteEcran({
  t,
  a,
  largeur,
  hauteur,
  taille,
  fond,
}: {
  t: Palette;
  a: AthletePublic;
  largeur: string;
  hauteur: string;
  taille: string;
  fond?: string;
}) {
  return (
    <div
      style={{
        width: largeur,
        height: hauteur,
        borderRadius: "1vh",
        border: `1px solid ${t.bord}`,
        backgroundColor: fond ?? t.carte,
        backgroundImage: a.photoUrl ? `url("${a.photoUrl}")` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: taille,
        fontWeight: 700,
        color: t.second,
        flex: "none",
        overflow: "hidden",
      }}
    >
      {a.photoUrl ? null : initiales(a)}
    </div>
  );
}

/** Le drapeau, en unités d'écran. */
export function DrapeauEcran({
  couleurs,
  largeur,
  hauteur,
}: {
  couleurs: readonly [string, string, string];
  largeur: string;
  hauteur: string;
}) {
  return (
    <span
      style={{ display: "flex", width: largeur, height: hauteur, overflow: "hidden", flex: "none" }}
    >
      <span style={{ flex: 1, background: couleurs[0] }} />
      <span style={{ flex: 1, background: couleurs[1] }} />
      <span style={{ flex: 1, background: couleurs[2] }} />
    </span>
  );
}
