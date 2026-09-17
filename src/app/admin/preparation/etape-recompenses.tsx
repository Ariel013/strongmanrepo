"use client";

import Link from "next/link";
import { C, METAUX, POINTS_CLUB_LISIBLE, couleurMetal, nomComplet, clubAffiche } from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Etiquette, styleBouton } from "@/components/ui";
import type { Palmares } from "@/lib/palmares";
import { BoutonAction, ChampTexte } from "@/components/saisie";
import {
  ajouterRecompense,
  enregistrerPartenaires,
  enregistrerRecompenseClub,
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
  recompenseClub,
  palmares,
}: {
  competitionId: string;
  recompenses: Recompense[];
  partenaires: string;
  recompenseClub: string;
  palmares: Palmares;
}) {
  /** Le lauréat d'une place dans une catégorie, ou rien tant que rien n'est classé. */
  const laureat = (categorieId: string, rang: number) =>
    palmares.categories
      .find((c) => c.id === categorieId)
      ?.laureats.find((l) => l.rang === rang) ?? null;
  const meilleurClub = palmares.clubs[0] ?? null;

  return (
    <div>
      <TitreSection
        debut="Récompenses"
        suite="et partenaires"
        chapeau="Titres, primes et lots par place, tels qu'ils s'affichent sur l'écran podium. Les lauréats se lisent ici dès que le classement commence. Le bandeau partenaires défile sur l'écran d'attente."
      />

      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/impression/palmares"
          title="Le palmarès à imprimer : les lauréats de chaque place par catégorie, et le meilleur club"
          style={styleBouton("creme", { padding: "11px 16px", borderRadius: 9 })}
        >
          Imprimer le palmarès
        </Link>
      </div>

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

                {/* Qui reçoit cette place, catégorie par catégorie */}
                <div
                  style={{
                    flex: "1 1 100%",
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    paddingTop: 8,
                    borderTop: `1px dashed ${C.papier3}`,
                  }}
                >
                  {palmares.categories.map((cat) => {
                    const l = laureat(cat.id, i + 1);
                    return (
                      <div
                        key={cat.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: C.papier2,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: cat.couleur, flex: "none" }} />
                        <span style={{ color: C.encre3 }}>{cat.nom} :</span>
                        {l ? (
                          <span style={{ fontWeight: 700, color: C.encre }}>
                            {nomComplet(l)}
                            <span style={{ fontWeight: 500, color: C.encre3 }}> · {clubAffiche(l.club)} · {l.total} pts</span>
                          </span>
                        ) : (
                          <span style={{ color: C.encre4 }}>
                            {palmares.commence ? "personne à ce rang" : "pas encore classé"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {palmares.categories.length === 0 ? (
                    <span style={{ fontSize: 12, color: C.encre4 }}>Aucune catégorie retenue.</span>
                  ) : null}
                </div>
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

      {/* ── Meilleur club ── */}
      <div
        style={{
          marginTop: 20,
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderLeft: `5px solid ${C.orange}`,
          borderRadius: 14,
          padding: "18px 20px",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Meilleur club</div>
        <div style={{ fontSize: 13, color: C.encre3, lineHeight: 1.5, marginBottom: 12, textWrap: "pretty" }}>
          Calculé sur le rang final de chaque athlète dans sa catégorie ({POINTS_CLUB_LISIBLE}).
          Écrivez ici ce que reçoit le club : il figure au palmarès imprimé.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 220px", padding: "10px 12px", borderRadius: 9, background: C.papier2, fontSize: 15 }}>
            {meilleurClub ? (
              <>
                <strong>{meilleurClub.club}</strong>
                <span style={{ color: C.encre3 }}> · {meilleurClub.points} pts · {meilleurClub.athletes} athlète{meilleurClub.athletes > 1 ? "s" : ""} classé{meilleurClub.athletes > 1 ? "s" : ""}</span>
              </>
            ) : (
              <span style={{ color: C.encre4 }}>Aucun résultat validé : le meilleur club se lira au fil des épreuves.</span>
            )}
          </div>
          <div style={{ flex: "2 1 240px" }}>
            <ChampTexte
              valeur={recompenseClub}
              placeholder="Trophée du meilleur club, prime…"
              title="Récompense du meilleur club, telle qu'elle figure au palmarès"
              enregistrer={(v) => enregistrerRecompenseClub(competitionId, v)}
              style={{ padding: "10px 12px", borderRadius: 9, fontSize: 15, fontWeight: 700, color: C.vertFonce }}
            />
          </div>
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
