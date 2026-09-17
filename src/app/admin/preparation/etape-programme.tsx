"use client";

import { C } from "@/lib/charte";
import Link from "next/link";
import { TitreSection } from "@/components/chrome";
import { styleBouton } from "@/components/ui";
import { BoutonAction, ChampTexte } from "@/components/saisie";
import {
  ajouterProgramme,
  modifierProgramme,
  supprimerProgramme,
} from "@/lib/actions";
import type { Programme } from "@/lib/db/schema";

/**
 * Étape 6 — le programme de la journée.
 *
 * Il n'alimente pas le classement : il alimente l'écran d'attente et la fiche
 * du speaker. C'est pour cela qu'il reste modifiable pendant la compétition.
 * Les récompenses et les partenaires ont leur propre étape, la septième.
 */
export function EtapeProgramme({
  competitionId,
  programme,
}: {
  competitionId: string;
  programme: Programme[];
}) {
  return (
    <div>
      <TitreSection
        debut="Programme"
        suite="de la journée"
        chapeau="Jour unique. Ce programme alimente l'écran d'attente du mur LED et la fiche du speaker. Les lignes se rangent toutes seules par heure (« 14h00 ») ; une heure illisible passe en fin. Les récompenses et les partenaires sont à l'étape suivante."
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
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <BoutonAction
            ton="pointille"
            title="Ajoute un moment au programme de la journée"
            action={() => ajouterProgramme(competitionId)}
          >
            + Ajouter une ligne
          </BoutonAction>
          <Link
            href="/admin/impression/programme"
            title="Le programme de la journée sur une page A4 : déroulé, épreuves, catégories, officiels"
            style={styleBouton("creme", { padding: "11px 16px", borderRadius: 9 })}
          >
            Imprimer le programme
          </Link>
        </div>
      </div>

    </div>
  );
}
