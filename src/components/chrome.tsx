/**
 * Chrome commun de l'administration — bandeau, drapeau, fil d'Ariane.
 *
 * Repris trait pour trait du fichier d'origine : mêmes dimensions, mêmes
 * dégradés, même bande tricolore sous l'en-tête. C'est ce qui est vu en
 * permanence pendant douze heures de compétition ; le moindre écart se
 * remarque plus qu'ailleurs.
 */

import Link from "next/link";
import { C } from "@/lib/charte";
import { BoutonRetour } from "./retour";

/** La colonne de 1180 px du fichier d'origine, avec sa marge basse de 80 px. */
export function Conteneur({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        // La marge latérale se resserre sur téléphone : 20 px de chaque côté
        // sur un écran de 360 px, c'est 11 % de la largeur perdus.
        padding: "0 clamp(12px, 4vw, 20px) 80px",
      }}
    >
      {children}
    </div>
  );
}

/**
 * La bande tricolore sous l'en-tête : orange, blanc, vert. Elle sert aussi de
 * repère de calibration sur le mur LED, d'où sa reprise à l'identique.
 */
export function Tricolore({
  hauteur = 5,
  arrondi = "0 0 3px 3px",
}: {
  hauteur?: number | string;
  arrondi?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: hauteur,
        borderRadius: arrondi,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, background: C.orange }} />
      <div style={{ flex: 1, background: C.blanc }} />
      <div style={{ flex: 1, background: C.vert }} />
    </div>
  );
}

/** L'en-tête : logo fédéral, intitulé du championnat, actions de droite. */
export function Bandeau({ actions }: { actions?: React.ReactNode }) {
  return (
    <>
      <div
        className="chrome-admin"
        style={{
          display: "flex",
          alignItems: "center",
          // Sur téléphone, le logo, l'intitulé et les deux actions ne tiennent
          // pas sur une ligne : ils s'empilent au lieu de se comprimer jusqu'à
          // rendre le titre illisible.
          flexWrap: "wrap",
          gap: 20,
          padding: "22px 26px",
          marginTop: 20,
          borderRadius: "16px 16px 0 0",
          background:
            "linear-gradient(115deg,#03562A 0%,#0B3D22 45%,#141210 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fibda.jpg"
          alt="FIBDA"
          style={{
            width: 62,
            height: 62,
            objectFit: "contain",
            background: C.papier,
            borderRadius: 10,
            padding: 4,
            flex: "none",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: C.orange,
            }}
          >
            Fédération Ivoirienne de Bodybuilding et Disciplines Associées
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-.01em",
              color: C.papier,
              lineHeight: 1.15,
            }}
          >
            Championnat National de Strongman{" "}
            <span style={{ color: C.orange }}>2026</span>
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {actions}
        </div>
      </div>
      <div className="chrome-admin">
        <Tricolore />
      </div>
    </>
  );
}

/**
 * Le fil d'Ariane et le témoin d'enregistrement.
 *
 * Le témoin n'est pas décoratif : sur le poste d'origine, il disait que la
 * saisie était déjà écrite sur le disque. Ici elle est écrite en base à
 * chaque validation — la promesse faite à l'officiel est la même.
 */
export function FilAriane({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="chrome-admin"
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        margin: "18px 0 26px",
        flexWrap: "wrap",
      }}
    >
      <BoutonRetour />
      <Link
        href="/"
        title="Revenir à l'accueil du championnat"
        style={{
          padding: "7px 13px",
          borderRadius: 8,
          border: `1px solid ${C.bordure}`,
          background: C.blanc,
          color: C.encre,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Accueil
      </Link>
      <span style={{ color: C.encre5, fontSize: 13 }}>›</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.vertFonce }}>
        {children}
      </span>
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 7,
          alignItems: "center",
        }}
        title="Chaque décision est écrite en base dès la validation ; aucune action n'est nécessaire."
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: C.vert,
            flex: "none",
          }}
        />
        <span style={{ fontSize: 12, color: C.encre4 }}>
          Enregistrement automatique
        </span>
      </span>
    </div>
  );
}

/** Le titre de section : « Mot <span orange>suite</span> », en capitales. */
export function TitreSection({
  debut,
  suite,
  chapeau,
}: {
  debut: string;
  suite?: string;
  chapeau?: string;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".01em",
          marginBottom: 6,
        }}
      >
        {debut} {suite ? <span style={{ color: C.orange }}>{suite}</span> : null}
      </div>
      {chapeau ? (
        <div
          style={{
            fontSize: 15,
            color: C.encre2,
            lineHeight: 1.55,
            maxWidth: 760,
            marginBottom: 22,
            textWrap: "pretty",
          }}
        >
          {chapeau}
        </div>
      ) : null}
    </>
  );
}
