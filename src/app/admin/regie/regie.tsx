"use client";

import { C } from "@/lib/charte";
import { Etiquette, styleBouton } from "@/components/ui";
import { BoutonAction, ChampTexte, ChoixListe } from "@/components/saisie";
import {
  ajouterSortie,
  basculerTheme,
  modifierSortie,
  supprimerSortie,
} from "@/lib/actions";

/**
 * Les contenus diffusables, dans l'ordre du menu d'origine — plus
 * « Résultats de l'épreuve », ajouté au portage pour diffuser le tableau
 * d'une épreuve finie sans attendre le classement général.
 */
const CONTENUS = [
  { cle: "attente", lbl: "Écran d'attente" },
  { cle: "plateau", lbl: "Athlète au plateau + chronomètre" },
  { cle: "ordre", lbl: "Ordre de passage à venir" },
  { cle: "verdict", lbl: "Dernier verdict validé" },
  { cle: "resultats", lbl: "Résultats de l'épreuve par catégorie" },
  { cle: "classement", lbl: "Classement général par catégorie" },
  { cle: "podium", lbl: "Podium et palmarès" },
  { cle: "mire", lbl: "Mire de lisibilité" },
] as const;

interface ClassementCategorie {
  id: string;
  nom: string;
  couleur: string;
  lignes: { rang: number; nom: string; perf: string; points: number }[];
}

export function Regie({
  competitionId,
  theme,
  sorties,
  nomEpreuveCourante,
  epreuveCouranteId,
  restants,
  parCategorie,
}: {
  competitionId: string;
  theme: "nuit" | "jour";
  sorties: { id: string; nom: string; contenu: string }[];
  nomEpreuveCourante: string;
  epreuveCouranteId: string | null;
  /** Passages de l'épreuve courante pas encore validés. */
  restants: number;
  parCategorie: ClassementCategorie[];
}) {
  return (
    <div>
      {/* ── Thème du mur LED ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 18,
        }}
      >
        <div style={{ flex: 1, minWidth: 200, fontSize: 15, fontWeight: 600 }}>
          {theme === "nuit"
            ? "Mur LED en mode nuit"
            : "Mur LED en mode jour"}
        </div>
        <BoutonAction
          ton="creme"
          title="Le mode nuit reste lisible en plein soleil et n'éblouit pas après 19h"
          action={() =>
            basculerTheme(competitionId, theme === "nuit" ? "jour" : "nuit")
          }
          style={{ padding: "10px 16px", borderRadius: 9 }}
        >
          Basculer jour / nuit
        </BoutonAction>
        <a
          href="/ecran/mire"
          target="_blank"
          rel="noreferrer"
          title="Ouvre la mire de lisibilité pour régler le mur LED avant l'ouverture au public"
          style={styleBouton("creme", { padding: "10px 16px", borderRadius: 9 })}
        >
          Ouvrir la mire
        </a>
      </div>

      {/* ── Résultats de l'épreuve en cours ── */}
      <div
        style={{
          background: C.blanc,
          border: `2px solid ${C.encre}`,
          borderRadius: 14,
          padding: "16px 18px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Résultats de l&apos;épreuve en cours
          </div>
          <div style={{ fontSize: 13, color: C.orange, fontWeight: 700 }}>
            {nomEpreuveCourante}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: C.encre4 }}>
            Classement séparé par catégorie, mis à jour à chaque validation
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: restants === 0 ? "rgba(11,146,55,.07)" : C.ambreFond,
            border: `1px solid ${restants === 0 ? "rgba(11,146,55,.18)" : C.ambreBord}`,
            fontSize: 13,
            fontWeight: 600,
            color: restants === 0 ? C.vertFonce : C.ambreEncre,
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            {restants === 0
              ? "Épreuve terminée : résultats définitifs, diffusables sur les écrans « Résultats de l'épreuve »."
              : `Épreuve en cours : ${restants} passage${restants > 1 ? "s" : ""} pas encore validé${restants > 1 ? "s" : ""}. Les résultats affichés sont provisoires.`}
          </div>
          <a
            href={`/admin/impression/resultats?epreuve=${epreuveCouranteId ?? ""}&categorie=tous`}
            title="Feuille de résultats de l'épreuve, une par catégorie, prête à signer"
            style={styleBouton(restants === 0 ? "vert" : "creme", {
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
            })}
          >
            Imprimer les résultats
          </a>
          <a
            href="/ecran/resultats"
            target="_blank"
            rel="noreferrer"
            title="Ouvre l'écran des résultats de l'épreuve dans une nouvelle fenêtre"
            style={styleBouton("creme", {
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
            })}
          >
            Ouvrir l&apos;écran résultats
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))",
            gap: 12,
          }}
        >
          {parCategorie.map((cc) => (
            <div
              key={cc.id}
              style={{
                border: `1px solid ${C.bordure}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  background: cc.couleur,
                  color: C.blanc,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                }}
              >
                {cc.nom}
              </div>
              {cc.lignes.length === 0 ? (
                <div
                  style={{
                    padding: "12px 14px",
                    fontSize: 13,
                    color: C.encre4,
                    lineHeight: 1.45,
                  }}
                >
                  Aucun passage validé pour l&apos;instant dans cette catégorie.
                </div>
              ) : null}
              {cc.lignes.map((l) => (
                <div
                  key={`${cc.id}-${l.rang}-${l.nom}`}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "9px 14px",
                    borderTop: `1px solid ${C.papier3}`,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      fontSize: 14,
                      fontWeight: 700,
                      color: cc.couleur,
                      flex: "none",
                    }}
                  >
                    {l.rang}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.25,
                    }}
                  >
                    {l.nom}
                  </div>
                  <div
                    style={{ fontSize: 13, color: C.encre2, flex: "none" }}
                  >
                    {l.perf}
                  </div>
                  <div
                    style={{
                      width: 30,
                      textAlign: "right",
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.vertFonce,
                      flex: "none",
                    }}
                  >
                    {l.points}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Les sorties vidéo ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorties.map((s) => (
          <div
            key={s.id}
            style={{
              background: C.blanc,
              border: `1px solid ${C.bordure}`,
              borderRadius: 14,
              padding: "16px 18px",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <Etiquette>Sortie</Etiquette>
              <ChampTexte
                valeur={s.nom}
                title="Nom de la sortie vidéo, affiché sur la mire"
                enregistrer={(v) => modifierSortie(s.id, "nom", v)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              />
            </div>
            <div style={{ flex: 1.4, minWidth: 220 }}>
              <Etiquette>Contenu diffusé</Etiquette>
              <ChoixListe
                valeur={s.contenu}
                title="Ce que le public voit sur cette sortie"
                enregistrer={(v) => modifierSortie(s.id, "contenu", v)}
                style={{ padding: "10px 12px", borderRadius: 9, fontSize: 15 }}
              >
                {CONTENUS.map((c) => (
                  <option key={c.cle} value={c.cle}>
                    {c.lbl}
                  </option>
                ))}
              </ChoixListe>
            </div>
            <a
              href={`/ecran/${s.contenu}?apercu=1`}
              title="Voir ce que le public verra, avec un retour vers la régie"
              style={styleBouton("creme", {
                padding: "11px 15px",
                borderRadius: 10,
              })}
            >
              Aperçu
            </a>
            <a
              href={`/ecran/${s.contenu}`}
              target="_blank"
              rel="noreferrer"
              title="Ouvre une fenêtre à glisser sur la sortie vidéo, puis passer en plein écran"
              style={styleBouton("vert", {
                padding: "11px 17px",
                borderRadius: 10,
              })}
            >
              Ouvrir la fenêtre
            </a>
            <BoutonAction
              ton="rouge"
              title="Retire cette sortie"
              action={() => supprimerSortie(s.id)}
              style={{ padding: "11px 15px", borderRadius: 10 }}
            >
              Retirer
            </BoutonAction>
          </div>
        ))}
        {sorties.length === 0 ? (
          <div
            style={{
              background: C.blanc,
              border: `1px solid ${C.bordure}`,
              borderRadius: 14,
              padding: "20px 18px",
              fontSize: 14,
              color: C.encre4,
              lineHeight: 1.5,
            }}
          >
            Aucune sortie déclarée. Ajoutez-en une par écran branché : le nom
            sert à s&apos;y retrouver quand six fenêtres sont ouvertes.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <BoutonAction
          ton="pointille"
          title="Ajoute une sortie vidéo"
          action={() => ajouterSortie(competitionId)}
          style={{ padding: "12px 20px" }}
        >
          + Ajouter une sortie
        </BoutonAction>
      </div>
    </div>
  );
}
