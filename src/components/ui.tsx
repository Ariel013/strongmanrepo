/**
 * Les briques d'interface du logiciel d'origine.
 *
 * Chaque style ici est repris du fichier autonome, valeur par valeur. Elles
 * sont regroupées pour qu'une retouche de charte se fasse en un seul endroit,
 * pas pour « simplifier » l'original : aucune n'invente de variante.
 */

import type { CSSProperties } from "react";
import { C } from "@/lib/charte";

/* ── Cartes et encarts ────────────────────────────────────────────────── */

/** La carte blanche standard : fond blanc, filet crème, coins à 14 px. */
export function Carte({
  children,
  style,
  appuyee = false,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
  /** Carte « appuyée » : filet noir de 2 px, pour ce qui demande une décision. */
  appuyee?: boolean;
}) {
  return (
    <div
      style={{
        background: C.blanc,
        border: appuyee ? `2px solid ${C.encre}` : `1px solid ${C.bordure}`,
        borderRadius: 14,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** L'en-tête gris d'une colonne : « À venir · 7 », « Passages terminés ». */
export function EnteteColonne({
  children,
  fond = C.papier2,
  encre = C.encre3,
}: {
  children: React.ReactNode;
  fond?: string;
  encre?: string;
}) {
  return (
    <div
      style={{
        padding: "13px 18px",
        background: fond,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: encre,
      }}
    >
      {children}
    </div>
  );
}

/** Le petit intitulé en capitales espacées, au-dessus de chaque champ. */
export function Etiquette({
  children,
  couleur = C.encre4,
  style,
}: {
  children: React.ReactNode;
  couleur?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: couleur,
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type TonEncart = "vert" | "rouge" | "ambre";

/**
 * Le bandeau d'information ou d'alerte. Trois tons seulement, chacun avec un
 * sens fixe : vert ce qui est fait, ambre ce qui manque, rouge ce qui bloque.
 */
export function Encart({
  ton,
  children,
  style,
}: {
  ton: TonEncart;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  const jeux = {
    vert: {
      background: "rgba(11,146,55,.07)",
      border: "1px solid rgba(11,146,55,.2)",
      color: C.vertFonce,
    },
    rouge: {
      background: C.rougeFond,
      border: `1px solid ${C.rougeBord}`,
      color: C.rougeFonce,
    },
    ambre: {
      background: C.ambreFond,
      border: `1px solid ${C.ambreBord}`,
      color: C.ambreEncre,
    },
  } as const;

  return (
    <div
      style={{
        padding: "13px 16px",
        borderRadius: 11,
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: 600,
        textWrap: "pretty",
        ...jeux[ton],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Pastilles ────────────────────────────────────────────────────────── */

/** La pastille de catégorie, pleine, en capitales. */
export function PastilleCategorie({
  nom,
  couleur,
  style,
}: {
  nom: string;
  couleur: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        background: couleur,
        color: C.blanc,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {nom}
    </span>
  );
}

/** Le drapeau : trois bandes, jamais une image. */
export function Drapeau({
  couleurs,
  largeur = 22,
  hauteur = 15,
  bord = true,
}: {
  couleurs: readonly [string, string, string];
  largeur?: number | string;
  hauteur?: number | string;
  bord?: boolean;
}) {
  return (
    <span
      style={{
        display: "flex",
        width: largeur,
        height: hauteur,
        border: bord ? `1px solid ${C.bordure2}` : undefined,
        overflow: "hidden",
        flex: "none",
      }}
    >
      <span style={{ flex: 1, background: couleurs[0] }} />
      <span style={{ flex: 1, background: couleurs[1] }} />
      <span style={{ flex: 1, background: couleurs[2] }} />
    </span>
  );
}

/**
 * La vignette photo d'un athlète : la photo en fond, les initiales dessous.
 *
 * Les initiales ne sont pas un pis-aller esthétique — une case vide sur le mur
 * LED se lit comme une panne d'affichage.
 */
export function Vignette({
  photoUrl,
  initiales,
  largeur,
  hauteur,
  taillePolice,
  arrondi = 9,
  fond = C.papier2,
  bord = C.bordure2,
  encre = C.encre4,
}: {
  photoUrl: string | null;
  initiales: string;
  largeur: number | string;
  hauteur: number | string;
  taillePolice: number | string;
  arrondi?: number | string;
  fond?: string;
  bord?: string;
  encre?: string;
}) {
  return (
    <div
      style={{
        width: largeur,
        height: hauteur,
        borderRadius: arrondi,
        border: `1px solid ${bord}`,
        backgroundColor: fond,
        backgroundImage: photoUrl ? `url("${photoUrl}")` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: taillePolice,
        fontWeight: 700,
        color: encre,
        flex: "none",
        overflow: "hidden",
      }}
    >
      {photoUrl ? null : initiales}
    </div>
  );
}

/* ── Boutons ──────────────────────────────────────────────────────────── */

export type TonBouton =
  | "vert"
  | "noir"
  | "blanc"
  | "creme"
  | "rouge"
  | "danger"
  | "orange"
  | "pointille";

/**
 * Les huit tons de bouton du fichier d'origine. Ils ne sont pas
 * interchangeables : le vert valide, le noir appelle, le rouge détruit.
 */
export function styleBouton(
  ton: TonBouton,
  style?: CSSProperties,
): CSSProperties {
  const jeux: Record<TonBouton, CSSProperties> = {
    vert: { border: "none", background: C.vert, color: C.blanc, fontWeight: 600 },
    noir: { border: "none", background: C.encre, color: C.blanc, fontWeight: 600 },
    blanc: {
      border: `1px solid ${C.bordure2}`,
      background: C.blanc,
      color: C.encre,
      fontWeight: 500,
    },
    creme: {
      border: `1px solid ${C.bordure2}`,
      background: C.papier,
      color: C.encre,
      fontWeight: 600,
    },
    rouge: {
      border: `1px solid ${C.rougeBord}`,
      background: C.blanc,
      color: C.rougeFonce,
      fontWeight: 500,
    },
    danger: {
      border: "none",
      background: C.rouge,
      color: C.blanc,
      fontWeight: 700,
    },
    orange: {
      border: `1px solid ${C.orange}`,
      background: C.ambreFond,
      color: C.orangeFonce,
      fontWeight: 700,
    },
    pointille: {
      border: `1px dashed ${C.encre5}`,
      background: C.blanc,
      color: C.vertFonce,
      fontWeight: 600,
    },
  };

  return {
    padding: "11px 18px",
    borderRadius: 10,
    fontSize: 14,
    cursor: "pointer",
    ...jeux[ton],
    ...style,
  };
}

/* ── Champs ───────────────────────────────────────────────────────────── */

/** Le style d'un champ de saisie, commun aux `input`, `select` et `textarea`. */
export function styleChamp(style?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    padding: "9px 11px",
    border: `1px solid ${C.bordure2}`,
    borderRadius: 8,
    background: C.papier,
    fontSize: 14,
    outline: "none",
    ...style,
  };
}
