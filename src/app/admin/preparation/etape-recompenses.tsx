"use client";

import { C, METAUX, couleurMetal } from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Etiquette } from "@/components/ui";
import { BoutonAction, ChampTexte } from "@/components/saisie";
import {
  ajouterRecompense,
  enregistrerPartenaires,
  modifierRecompense,
  retablirRecompenses,
  supprimerRecompense,
} from "@/lib/actions";
import type { Recompense } from "@/lib/db/schema";

/** Le rang, en toutes lettres : « 1ère place », « 2e place »… */
const libRang = (i: number): string =>
  i === 0 ? "1ère place" : `${i + 1}e place`;

/**
 * Étape 7 — les récompenses et les partenaires.
 *
 * Sortie de l'étape Programme à la demande de Kevin : titres, primes et lots
 * se décident à part du déroulé. Ces blocs n'alimentent pas le classement,
 * ils alimentent l'écran podium et le bandeau de l'écran d'attente — d'où
 * leur modification possible pendant la compétition.
 */
export function EtapeRecompenses({
  competitionId,
  recompenses,
  partenaires,
}: {
  competitionId: string;
  recompenses: Recompense[];
  partenaires: string;
}) {
  return (
    <div>
      <TitreSection
        debut="Récompenses"
        suite="et partenaires"
        chapeau="Titres, primes et lots par place, tels qu'ils s'affichent sur l'écran podium. Le bandeau partenaires défile sur l'écran d'attente."
      />

      {/* ── Récompenses ── */}
      <div
        style={{
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
