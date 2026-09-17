"use client";

import { useState, useTransition } from "react";
import { C, COUL_CAT, virgule } from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Encart, Etiquette, styleBouton } from "@/components/ui";
import { BoutonAction, ChampTexte } from "@/components/saisie";
import {
  ajouterCategorie,
  modifierCategorie,
  supprimerCategorie,
} from "@/lib/actions";
import type { CategorieVue } from "@/lib/donnees";
import { incoherencesCategories } from "@/lib/classement";

/**
 * Étape 2 — les groupes de poids.
 *
 * « Retenue » et « mise de côté » ne sont pas un détail d'affichage : une
 * catégorie mise de côté disparaît du plateau et des écrans géants mais garde
 * ses athlètes et son historique. C'est ce qui permet d'annuler une catégorie
 * le matin même, faute d'engagés, sans rien perdre.
 */
export function EtapeGroupes({
  competitionId,
  categories,
  effectifs,
}: {
  competitionId: string;
  categories: CategorieVue[];
  effectifs: Record<string, number>;
}) {
  // Un trou entre deux bornes ne se voit pas en lisant les lignes une à une :
  // il faut comparer la borne haute de l'une à la borne basse de l'autre. Le
  // jour de la pesée est un mauvais moment pour le découvrir.
  const soucis = incoherencesCategories(
    categories
      .filter((c) => c.active)
      .map((c) => ({ nom: c.nom, poidsMin: c.poidsMin, poidsMax: c.poidsMax })),
  );

  return (
    <div>
      <TitreSection
        debut="Groupes"
        suite="de poids"
        chapeau="Championnat réservé aux hommes. Deux groupes : moins de 100 kg et plus de 100 kg. Chaque groupe a son propre classement, même quand le passage se fait tout le monde mélangé. Seules les catégories retenues sont proposées au plateau et affichées sur les écrans géants."
      />

      {soucis.length > 0 ? (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {soucis.map((x) => (
            <Encart key={x} ton="ambre">
              {x}
            </Encart>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))",
          gap: 14,
        }}
      >
        {categories.map((g) => (
          <FicheGroupe
            key={g.id}
            groupe={g}
            couleur={g.couleur}
            effectif={effectifs[g.id] ?? 0}
          />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <BoutonAction
          ton="pointille"
          title="Ajoute un groupe de poids supplémentaire"
          action={() => ajouterCategorie(competitionId)}
          style={{ padding: "12px 20px" }}
        >
          + Ajouter un groupe
        </BoutonAction>
      </div>
    </div>
  );
}

/**
 * La couleur de la catégorie : sept pastilles de la palette, plus le sélecteur
 * natif pour une couleur libre. C'est elle qui teinte le plateau, les écrans
 * géants, les impressions.
 */
function ChoixCouleur({
  valeur,
  enregistrer,
}: {
  valeur: string;
  enregistrer: (v: string) => Promise<{ ok: boolean; erreur?: string }>;
}) {
  const [erreur, setErreur] = useState("");
  const [, demarrer] = useTransition();
  const choisir = (v: string) =>
    demarrer(async () => {
      try {
        const r = await enregistrer(v);
        setErreur(r.ok ? "" : (r.erreur ?? "Couleur refusée."));
      } catch {
        setErreur("Le serveur n'a pas répondu : la couleur n'a pas changé.");
      }
    });

  return (
    <div style={{ marginBottom: 12 }}>
      <Etiquette>Couleur de la catégorie</Etiquette>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {COUL_CAT.map((c) => {
          const active = c.toUpperCase() === valeur.toUpperCase();
          return (
            <button
              key={c}
              type="button"
              title={`Choisir ${c}`}
              onClick={() => choisir(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: c,
                border: active ? `3px solid ${C.encre}` : `1px solid ${C.bordure2}`,
                cursor: "pointer",
                padding: 0,
              }}
            />
          );
        })}
        <label
          title="Une autre couleur, au choix"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: C.encre3,
            cursor: "pointer",
          }}
        >
          <input
            type="color"
            value={valeur}
            onChange={(e) => choisir(e.target.value)}
            style={{ width: 28, height: 28, padding: 0, border: `1px solid ${C.bordure2}`, borderRadius: 8, background: "transparent", cursor: "pointer" }}
          />
          Autre
        </label>
        <span style={{ fontSize: 12, color: C.encre4, fontFamily: "monospace" }}>
          {valeur.toUpperCase()}
        </span>
      </div>
      {erreur ? (
        <div role="alert" style={{ marginTop: 6, fontSize: 12, color: C.rougeFonce, fontWeight: 600 }}>
          {erreur}
        </div>
      ) : null}
    </div>
  );
}

function FicheGroupe({
  groupe,
  couleur,
  effectif,
}: {
  groupe: CategorieVue;
  couleur: string;
  effectif: number;
}) {
  const [aSupprimer, setASupprimer] = useState(false);

  const bornes =
    groupe.poidsMin === null && groupe.poidsMax === null
      ? "Aucune limite de poids : tout athlète peut y entrer."
      : groupe.poidsMin === null
        ? `Jusqu'à ${virgule(groupe.poidsMax)} kg inclus.`
        : groupe.poidsMax === null
          ? `Au-dessus de ${virgule(groupe.poidsMin)} kg.`
          : `De plus de ${virgule(groupe.poidsMin)} kg à ${virgule(groupe.poidsMax)} kg inclus.`;

  return (
    <div
      style={{
        background: C.blanc,
        border: `1px solid ${C.bordure}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 4, background: couleur }} />
      <div style={{ padding: "18px 20px" }}>
        <ChoixCouleur
          valeur={couleur}
          enregistrer={(v) => modifierCategorie(groupe.id, "couleur", v)}
        />
        <ChampTexte
          valeur={groupe.nom}
          title="Nom du groupe tel qu'il apparaît sur les classements et les impressions"
          enregistrer={(v) => modifierCategorie(groupe.id, "nom", v)}
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            fontSize: 17,
            fontWeight: 600,
          }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <Etiquette>Poids min (kg)</Etiquette>
            <ChampTexte
              valeur={groupe.poidsMin === null ? "" : virgule(groupe.poidsMin)}
              placeholder="—"
              title="Poids au-dessus duquel un athlète entre dans ce groupe. Laisser vide s'il n'y a pas de limite basse."
              enregistrer={(v) => modifierCategorie(groupe.id, "poidsMin", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Etiquette>Poids max (kg)</Etiquette>
            <ChampTexte
              valeur={groupe.poidsMax === null ? "" : virgule(groupe.poidsMax)}
              placeholder="—"
              title="Poids maximum inclus dans ce groupe. Laisser vide s'il n'y a pas de limite haute."
              enregistrer={(v) => modifierCategorie(groupe.id, "poidsMax", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <BoutonAction
            ton={groupe.active ? "vert" : "blanc"}
            title="Retenir cette catégorie : elle est proposée au plateau et affichée sur les écrans géants"
            action={() => modifierCategorie(groupe.id, "active", true)}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 9,
              fontWeight: 700,
            }}
          >
            Sélectionner
          </BoutonAction>
          <BoutonAction
            ton={groupe.active ? "blanc" : "noir"}
            title="Mettre cette catégorie de côté : elle reste enregistrée mais disparaît du plateau et des écrans"
            action={() => modifierCategorie(groupe.id, "active", false)}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 9,
              fontWeight: 700,
            }}
          >
            Mettre de côté
          </BoutonAction>
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.45,
            color: C.encre4,
            textWrap: "pretty",
          }}
        >
          {groupe.active ? "Catégorie retenue. " : "Catégorie mise de côté. "}
          {bornes}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${C.papier3}`,
          }}
        >
          <div style={{ fontSize: 14, color: C.encre2 }}>
            {effectif === 0
              ? "Aucun athlète"
              : `${effectif} athlète${effectif > 1 ? "s" : ""}`}
          </div>
          <button
            type="button"
            title="Retirer cette catégorie"
            onClick={() => setASupprimer(true)}
            style={styleBouton("rouge", {
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 13,
              flex: "none",
            })}
          >
            Retirer
          </button>
        </div>

        {aSupprimer ? (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 11,
              background: C.rougeFond,
              border: `1px solid ${C.rougeBord}`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.rougeFonce,
                marginBottom: 4,
              }}
            >
              Supprimer « {groupe.nom} » ?
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: C.rougeFonce,
                marginBottom: 12,
                textWrap: "pretty",
              }}
            >
              {effectif > 0
                ? `${effectif} athlète(s) s'y trouvent : ils ne sont pas supprimés, ils repassent « sans catégorie » et devront être réaffectés.`
                : "Aucun athlète n'y est rattaché. La suppression est sans effet sur les classements."}{" "}
              Les récompenses propres à cette catégorie sont supprimées, et les
              officiels qui lui étaient affectés repassent « toutes catégories ».{" "}
              Pour retirer la catégorie du plateau sans rien perdre, préférez
              « Mettre de côté ».
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                title="Ne rien supprimer"
                onClick={() => setASupprimer(false)}
                style={styleBouton("blanc", {
                  flex: 1,
                  minWidth: 110,
                  padding: 10,
                  borderRadius: 9,
                  fontWeight: 600,
                })}
              >
                Annuler
              </button>
              <BoutonAction
                ton="danger"
                title="Supprimer définitivement cette catégorie"
                action={() => supprimerCategorie(groupe.id)}
                style={{
                  flex: 1,
                  minWidth: 110,
                  padding: 10,
                  borderRadius: 9,
                }}
              >
                Supprimer
              </BoutonAction>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
