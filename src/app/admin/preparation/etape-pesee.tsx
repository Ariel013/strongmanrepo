"use client";

import { C, clubAffiche, nomComplet, virgule } from "@/lib/charte";
import Link from "next/link";
import { TitreSection } from "@/components/chrome";
import { Etiquette, styleBouton } from "@/components/ui";
import { BoutonAction, ChampTexte, ChoixListe } from "@/components/saisie";
import {
  affecterCategorie,
  enregistrerPoids,
  modifierAthlete,
  validerPesee,
} from "@/lib/actions";
import type { CategorieVue, FicheAthlete } from "@/lib/donnees";

/**
 * Étape 5 — la pesée et la vérification.
 *
 * La validation verrouille la ligne : poids, dossard et catégorie ne bougent
 * plus. C'est le moment où la compétition devient officielle pour cet
 * athlète — le déverrouillage reste possible, mais il est visible.
 */
export function EtapePesee({
  athletes,
  categories,
}: {
  athletes: FicheAthlete[];
  categories: CategorieVue[];
}) {
  const valides = athletes.filter((a) => a.peseeValidee).length;
  const peses = athletes.filter((a) => a.poidsCorps !== null).length;

  return (
    <div>
      <TitreSection
        debut="Pesée"
        suite="et vérification"
        chapeau="14h00 — 15h00 : accueil, pesée, vérification des équipements. La validation attribue le groupe et le dossard, puis verrouille la ligne."
      />
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/admin/impression/pesee"
          title="Une feuille de pesée par catégorie : l'officiel note le poids pesé, la table reporte ici"
          style={styleBouton("creme", { padding: "11px 16px", borderRadius: 9 })}
        >
          Imprimer les feuilles de pesée
        </Link>
      </div>

      <div
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {athletes.map((a) => (
          <LignePesee key={a.id} a={a} categories={categories} />
        ))}
        {athletes.length === 0 ? (
          <div
            style={{
              padding: "20px 18px",
              fontSize: 14,
              color: C.encre4,
              lineHeight: 1.5,
            }}
          >
            Aucun athlète engagé. Revenez à l&apos;étape Athlètes.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: C.encre4 }}>
        {valides} pesée{valides > 1 ? "s" : ""} validée
        {valides > 1 ? "s" : ""} sur {athletes.length} engagé
        {athletes.length > 1 ? "s" : ""}
        {peses > valides
          ? ` · ${peses - valides} poids saisi(s) mais non validé(s)`
          : ""}
      </div>
    </div>
  );
}

function LignePesee({
  a,
  categories,
}: {
  a: FicheAthlete;
  categories: CategorieVue[];
}) {
  const verrou = a.peseeValidee;
  const fond = verrou ? C.papier2 : C.papier;

  /** Le groupe déduit du poids, à titre indicatif tant que rien n'est validé. */
  const deduite = categories
    .filter((c) => c.active)
    .find(
      (c) =>
        a.poidsCorps !== null &&
        (c.poidsMin === null || a.poidsCorps > c.poidsMin) &&
        (c.poidsMax === null || a.poidsCorps <= c.poidsMax),
    );

  const empeche =
    a.poidsCorps === null
      ? "Relevez d'abord le poids à la bascule."
      : !a.horsClassement && !a.categorieId && !deduite
        ? "Aucune catégorie retenue ne correspond à ce poids : choisissez-en une, ou déclarez l'athlète indépendant."
        : a.dossard === null
          ? "Attribuez un dossard : il fixe l'ordre de passage de la première épreuve."
          : "";

  return (
    <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.papier3}` }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flex: "2 1 220px",
            minWidth: 180,
          }}
        >
          <div style={{ width: 52, flex: "none" }}>
            <ChampTexte
              valeur={a.dossard === null ? "" : String(a.dossard)}
              placeholder="—"
              inputMode="numeric"
              disabled={verrou}
              title="Numéro de dossard, saisi à la main"
              enregistrer={(v) => modifierAthlete(a.id, "dossard", v)}
              style={{
                padding: "7px 6px",
                borderRadius: 7,
                background: fond,
                fontSize: 16,
                fontWeight: 700,
                textAlign: "center",
                color: verrou ? C.vertFonce : C.encre,
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
              {nomComplet(a)}
            </div>
            <div style={{ fontSize: 13, color: C.encre4 }}>
              {clubAffiche(a.club)}
              {a.poidsDeclare !== null
                ? ` · annoncé ${virgule(a.poidsDeclare)} kg`
                : ""}
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 110px", minWidth: 100 }}>
          <Etiquette style={{ letterSpacing: ".1em", marginBottom: 5 }}>
            Poids (kg)
          </Etiquette>
          <ChampTexte
            valeur={a.poidsCorps === null ? "" : virgule(a.poidsCorps)}
            placeholder="—"
            inputMode="decimal"
            disabled={verrou}
            title="Poids relevé à la bascule. La catégorie en est déduite à la validation."
            enregistrer={(v) => enregistrerPoids(a.id, v)}
            style={{
              padding: "9px 11px",
              background: fond,
              fontSize: 15,
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ flex: "2 1 190px", minWidth: 160 }}>
          <Etiquette style={{ letterSpacing: ".1em", marginBottom: 5 }}>
            Catégorie
          </Etiquette>
          <ChoixListe
            valeur={a.horsClassement ? "hors" : (a.categorieId ?? "")}
            disabled={verrou}
            title="Catégorie de l'athlète. Laissée vide, elle est déduite du poids pesé à la validation."
            enregistrer={(v) => affecterCategorie([a.id], v)}
            style={{ padding: "9px 11px", background: fond }}
          >
            <option value="">
              {deduite ? `— Déduite : ${deduite.nom} —` : "— Déduite du poids —"}
            </option>
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            <option value="hors">Indépendant — hors classement</option>
          </ChoixListe>
        </div>

        <BoutonAction
          ton={verrou ? "blanc" : "vert"}
          title="Valider affecte la catégorie, attribue le dossard et verrouille la ligne. Déverrouiller permet de corriger une erreur de pesée."
          disabled={!verrou && empeche !== ""}
          action={async () => {
            if (!verrou) {
              // La catégorie déduite du poids n'est écrite qu'ici : c'est la
              // validation de l'officiel qui l'engage, pas la frappe.
              if (!a.horsClassement && !a.categorieId && deduite)
                await affecterCategorie([a.id], deduite.id);
            }
            return validerPesee(a.id, !verrou);
          }}
          style={{
            flex: "1 1 140px",
            minWidth: 130,
            padding: "11px 13px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {verrou ? "Déverrouiller" : "Valider la pesée"}
        </BoutonAction>
      </div>

      {!verrou && empeche ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 9,
            background: C.rougeFond,
            border: `1px solid ${C.rougeBord}`,
            color: C.rougeFonce,
            fontSize: 13,
            lineHeight: 1.45,
            fontWeight: 600,
            textWrap: "pretty",
          }}
        >
          {empeche}
        </div>
      ) : null}
    </div>
  );
}
