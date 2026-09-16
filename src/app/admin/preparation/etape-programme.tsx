"use client";

import { C, METAUX, couleurMetal } from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Etiquette } from "@/components/ui";
import { BoutonAction, ChampTexte } from "@/components/saisie";
import {
  ajouterProgramme,
  ajouterRecompense,
  enregistrerPartenaires,
  modifierProgramme,
  modifierRecompense,
  retablirRecompenses,
  supprimerProgramme,
  supprimerRecompense,
} from "@/lib/actions";
import type { Programme, Recompense } from "@/lib/db/schema";

/** Le rang, en toutes lettres : « 1ère place », « 2e place »… */
const libRang = (i: number): string =>
  i === 0 ? "1ère place" : `${i + 1}e place`;

/**
 * Étape 6 — le programme, les récompenses, les partenaires.
 *
 * Ces trois blocs n'alimentent pas le classement : ils alimentent l'écran
 * d'attente, l'écran podium et la fiche du speaker. C'est pour cela qu'ils
 * restent modifiables pendant la compétition — une dotation annoncée la veille
 * change parfois le matin même.
 */
export function EtapeProgramme({
  competitionId,
  programme,
  recompenses,
  partenaires,
}: {
  competitionId: string;
  programme: Programme[];
  recompenses: Recompense[];
  partenaires: string;
}) {
  return (
    <div>
      <TitreSection
        debut="Programme"
        suite="de la journée"
        chapeau="Jour unique. Ce programme alimente l'écran d'attente du mur LED et la fiche du speaker."
      />

      {/* ── Le déroulé de la journée ── */}
      <div
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "8px 18px 18px",
        }}
      >
        {programme.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              padding: "14px 0",
              borderBottom: `1px solid ${C.papier3}`,
            }}
          >
            <div style={{ flex: "none", width: 96 }}>
              <ChampTexte
                valeur={p.heure}
                title="Heure affichée sur l'écran d'attente et la fiche du speaker"
                enregistrer={(v) => modifierProgramme(p.id, "heure", v)}
                style={{
                  padding: "8px 10px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.vertFonce,
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ChampTexte
                valeur={p.texte}
                title="Intitulé du moment : accueil, briefing, épreuve, remise des récompenses"
                enregistrer={(v) => modifierProgramme(p.id, "texte", v)}
                style={{ padding: "8px 10px", fontSize: 15 }}
              />
            </div>
            <BoutonAction
              ton="rouge"
              title="Retire cette ligne du programme"
              action={() => supprimerProgramme(p.id)}
              style={{
                flex: "none",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Retirer
            </BoutonAction>
          </div>
        ))}
        {programme.length === 0 ? (
          <div
            style={{
              padding: "14px 0",
              fontSize: 14,
              color: C.encre4,
              lineHeight: 1.5,
            }}
          >
            Aucun moment déclaré : l&apos;écran d&apos;attente n&apos;affichera
            que le compte à rebours et la liste des engagés.
          </div>
        ) : null}
        <div style={{ marginTop: 16 }}>
          <BoutonAction
            ton="pointille"
            title="Ajoute un moment au programme de la journée"
            action={() => ajouterProgramme(competitionId)}
          >
            + Ajouter une ligne
          </BoutonAction>
        </div>
      </div>

      {/* ── Récompenses ── */}
      <div
        style={{
          marginTop: 20,
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "18px 20px",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Récompenses
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.encre3,
            lineHeight: 1.5,
            marginBottom: 14,
            textWrap: "pretty",
          }}
        >
          Titre, prime et lot de chaque place. Ce que vous écrivez ici
          s&apos;affiche sur l&apos;écran Podium et figure au procès-verbal.
          Modifiable à tout moment, même pendant la compétition.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recompenses.map((r, i) => {
            const couleur = couleurMetal(i);
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                  padding: 12,
                  border: `1px solid ${C.bordure}`,
                  borderLeft: `5px solid ${couleur}`,
                  borderRadius: 11,
                }}
              >
                <div
                  style={{
                    flex: "none",
                    width: 80,
                    fontSize: 14,
                    fontWeight: 700,
                    color: couleur,
                  }}
                >
                  {libRang(i)}
                </div>
                <div style={{ flex: "2 1 170px", minWidth: 140 }}>
                  <ChampTexte
                    valeur={r.titre}
                    placeholder={METAUX[i] ?? "Distinction"}
                    title="Intitulé de la distinction"
                    enregistrer={(v) => modifierRecompense(r.id, "titre", v)}
                  />
                </div>
                <div style={{ flex: "1 1 130px", minWidth: 110 }}>
                  <ChampTexte
                    valeur={r.prime}
                    placeholder="500 000 fr"
                    title="Prime en espèces annoncée sur l'écran Podium"
                    enregistrer={(v) => modifierRecompense(r.id, "prime", v)}
                    style={{ fontWeight: 700, color: C.vertFonce }}
                  />
                </div>
                <div style={{ flex: "2 1 170px", minWidth: 140 }}>
                  <ChampTexte
                    valeur={r.lot}
                    placeholder="Trophée, dotation…"
                    title="Lot en nature, facultatif"
                    enregistrer={(v) => modifierRecompense(r.id, "lot", v)}
                  />
                </div>
                <BoutonAction
                  ton="rouge"
                  title="Retire cette récompense"
                  action={() => supprimerRecompense(r.id)}
                  style={{
                    flex: "none",
                    padding: "9px 13px",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  Retirer
                </BoutonAction>
              </div>
            );
          })}
        </div>

        <div
          style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}
        >
          <BoutonAction
            ton="pointille"
            title="Ajoute une place récompensée"
            action={() => ajouterRecompense(competitionId)}
          >
            + Ajouter une récompense
          </BoutonAction>
          <BoutonAction
            ton="blanc"
            title="Revient aux trois médailles et primes officielles"
            confirmation="Rétablir les trois médailles et primes officielles ? Les récompenses saisies ici sont remplacées."
            action={() => retablirRecompenses(competitionId)}
          >
            Rétablir les valeurs officielles
          </BoutonAction>
        </div>
      </div>

      {/* ── Bandeau partenaires ── */}
      <div
        style={{
          marginTop: 20,
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "18px 20px",
        }}
      >
        <Etiquette style={{ marginBottom: 8 }}>Bandeau partenaires</Etiquette>
        <ChampTexte
          valeur={partenaires}
          placeholder="Noms séparés par des virgules"
          title="Noms défilant sur l'écran d'attente et entre les passages"
          enregistrer={(v) => enregistrerPartenaires(competitionId, v)}
          style={{ padding: "10px 12px", borderRadius: 9, fontSize: 15 }}
        />
        <div
          style={{
            fontSize: 13,
            color: C.encre4,
            marginTop: 7,
            lineHeight: 1.45,
          }}
        >
          Affiché sur l&apos;écran d&apos;attente et entre les passages.
        </div>
      </div>
    </div>
  );
}
