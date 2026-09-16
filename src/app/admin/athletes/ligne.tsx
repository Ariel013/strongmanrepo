"use client";

import { useTransition } from "react";
import {
  supprimerAthlete,
  validerPesee,
  enregistrerAthlete,
} from "@/lib/actions";
import type { AthletePublic } from "@/lib/donnees";

interface Cat {
  id: string;
  nom: string;
}

/** Affiche un poids à la française : 104.5 → « 104,5 ». */
const poidsFr = (v: number | null) =>
  v === null ? "—" : String(v).replace(".", ",");

export function LigneAthlete({
  athlete,
  categories,
}: {
  athlete: AthletePublic;
  categories: Cat[];
}) {
  const [enCours, demarrer] = useTransition();

  /**
   * Changer la catégorie depuis la liste renvoie l'athlète entier : l'action
   * d'enregistrement est la même que pour le formulaire, donc une seule règle
   * de validation, à un seul endroit.
   */
  function changerCategorie(categorieId: string) {
    const donnees = new FormData();
    donnees.set("id", athlete.id);
    donnees.set("competitionId", "—"); // ignoré en modification
    donnees.set("nom", athlete.nom);
    donnees.set("prenoms", athlete.prenoms);
    donnees.set("club", athlete.club ?? "");
    donnees.set("pays", athlete.pays);
    donnees.set("dossard", athlete.dossard?.toString() ?? "");
    donnees.set("poidsCorps", athlete.poidsCorps?.toString() ?? "");
    donnees.set("categorieId", categorieId);
    if (athlete.horsClassement) donnees.set("horsClassement", "on");
    demarrer(async () => {
      await enregistrerAthlete({ ok: false }, donnees);
    });
  }

  return (
    <tr className={enCours ? "opacity-50" : undefined}>
      <td className="px-3 py-2.5 font-medium">{athlete.dossard ?? "—"}</td>
      <td className="px-3 py-2.5">
        <span className="font-medium">{athlete.nom}</span>{" "}
        <span className="text-encre-2">{athlete.prenoms}</span>
        {athlete.horsClassement && (
          <span className="ml-2 rounded bg-orange/15 px-1.5 py-0.5 text-xs text-orange-fonce">
            hors classement
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-encre-2">{athlete.club ?? "—"}</td>
      <td className="px-3 py-2.5">{poidsFr(athlete.poidsCorps)}</td>
      <td className="px-3 py-2.5">
        <select
          value={athlete.categorieId ?? ""}
          onChange={(e) => changerCategorie(e.target.value)}
          disabled={enCours}
          className="rounded border border-bordure-2 bg-papier px-2 py-1 text-sm"
        >
          <option value="">— aucune —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              await validerPesee(athlete.id, !athlete.peseeValidee);
            })
          }
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            athlete.peseeValidee
              ? "bg-vert/15 text-vert"
              : "bg-papier-2 text-encre-3 hover:bg-bordure"
          }`}
        >
          {athlete.peseeValidee ? "✓ validée" : "à valider"}
        </button>
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          disabled={enCours}
          onClick={() => {
            // Une suppression en pleine compétition se confirme : elle
            // recalcule les points de toute la catégorie.
            if (
              !confirm(
                `Retirer ${athlete.nom} ${athlete.prenoms} ?\n\n` +
                  "Ses passages et ses résultats seront supprimés, et les " +
                  "points de sa catégorie seront recalculés.",
              )
            )
              return;
            demarrer(async () => {
              await supprimerAthlete(athlete.id);
            });
          }}
          className="text-xs text-encre-3 underline transition hover:text-rouge"
        >
          retirer
        </button>
      </td>
    </tr>
  );
}
