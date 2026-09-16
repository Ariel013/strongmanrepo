"use client";

import { BANDES, C, MESURES, aideMesure } from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Encart, Etiquette } from "@/components/ui";
import { BoutonAction, ChampTexte, ChoixListe } from "@/components/saisie";
import {
  ajouterEpreuve,
  modifierEpreuve,
  supprimerEpreuve,
} from "@/lib/actions";
import type { EpreuveComplete } from "@/lib/donnees";

/**
 * Étape 1 — les épreuves du championnat.
 *
 * Chaque fiche porte ce qui décide du classement : la mesure, le temps
 * imparti, le nombre d'essais, le critère de règlement. Le critère est en
 * clair, sous un liseré orange, parce que c'est ce que le juge relit à voix
 * haute avant le passage.
 */
export function EtapeEpreuves({
  competitionId,
  epreuves,
}: {
  competitionId: string;
  epreuves: EpreuveComplete[];
}) {
  return (
    <div>
      <TitreSection
        debut="Épreuves"
        suite="du championnat"
        chapeau="Les cinq épreuves officielles sont pré-remplies avec le critère de classement du règlement. Ajoutez autant d'épreuves que nécessaire, chacune avec sa mesure, son temps imparti et son nombre d'essais."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {epreuves.map((ep, i) => (
          <FicheEpreuve key={ep.id} ep={ep} rang={i} />
        ))}
      </div>

      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}
      >
        <BoutonAction
          ton="pointille"
          title="Crée une épreuve supplémentaire avec ses propres critères de notation"
          action={() => ajouterEpreuve(competitionId, false)}
          style={{ padding: "12px 20px" }}
        >
          + Ajouter une épreuve
        </BoutonAction>
        <BoutonAction
          ton="orange"
          title="Crée un medley : parcours à ateliers enchaînés sur une même distance, chronométré du départ à l'arrivée."
          action={() => ajouterEpreuve(competitionId, true)}
          style={{ padding: "12px 20px" }}
        >
          + Ajouter un medley
        </BoutonAction>
      </div>

      <div
        style={{
          marginTop: 22,
          padding: "14px 16px",
          borderRadius: 11,
          background: "rgba(11,146,55,.07)",
          border: "1px solid rgba(11,146,55,.18)",
          fontSize: 13,
          lineHeight: 1.5,
          color: C.vertFonce,
        }}
      >
        Barème appliqué : <strong>Points = N − Rang + 1</strong>, N étant le
        nombre de participants classés du groupe. Ex æquo : mêmes points, rang
        suivant sauté. Un zéro ou un forfait vaut 0 point et l&apos;athlète reste
        classé au général.
      </div>
    </div>
  );
}

function FicheEpreuve({ ep, rang }: { ep: EpreuveComplete; rang: number }) {
  const estMedley = ep.mesure === "medley";

  return (
    <div
      style={{
        background: C.blanc,
        border: `1px solid ${C.bordure}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{ height: 4, background: BANDES[rang % BANDES.length] }}
      />
      <div style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              background: C.encre,
              color: C.papier,
              fontSize: 14,
              fontWeight: 700,
              flex: "none",
            }}
          >
            {rang + 1}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <ChampTexte
              valeur={ep.nom}
              placeholder="Nom de l'épreuve"
              title="Nom annoncé par le speaker et affiché sur le mur LED"
              enregistrer={(v) => modifierEpreuve(ep.id, "nom", v)}
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                fontSize: 16,
                fontWeight: 600,
              }}
            />
          </div>
          <BoutonAction
            ton="rouge"
            title="Retire cette épreuve du championnat"
            confirmation={`Retirer « ${ep.nom} » ? Les passages et résultats de cette épreuve sont supprimés avec elle.`}
            action={() => supprimerEpreuve(ep.id)}
            style={{
              padding: "8px 13px",
              borderRadius: 8,
              fontSize: 13,
              flex: "none",
            }}
          >
            Retirer
          </BoutonAction>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          <div>
            <Etiquette>Mesure</Etiquette>
            <ChoixListe
              valeur={ep.mesure}
              title="Ce qui est mesuré : cela détermine la saisie du juge et le sens du classement"
              enregistrer={(v) => modifierEpreuve(ep.id, "mesure", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            >
              {MESURES.map((m) => (
                <option key={m.cle} value={m.cle}>
                  {m.lbl}
                </option>
              ))}
            </ChoixListe>
            <div
              style={{
                fontSize: 12,
                color: C.encre4,
                marginTop: 5,
                lineHeight: 1.4,
              }}
            >
              {aideMesure(ep.mesure)}
            </div>
          </div>

          <div>
            <Etiquette>Temps imparti</Etiquette>
            <ChampTexte
              valeur={ep.tempsLimiteS === null ? "Illimité" : `${ep.tempsLimiteS} s`}
              placeholder="ex. 60 s ou illimité"
              title="Durée préparée d'office sur le chronomètre à chaque passage de cette épreuve"
              enregistrer={(v) => modifierEpreuve(ep.id, "tempsLimiteS", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            />
          </div>

          <div>
            <Etiquette>Essais par athlète</Etiquette>
            <ChampTexte
              valeur={String(ep.essais)}
              type="number"
              title="Nombre de tentatives autorisées. Enregistré et exporté, mais le plateau ne crée qu'un passage par athlète : les essais multiples ne sont pas encore gérés."
              enregistrer={(v) => modifierEpreuve(ep.id, "essais", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            />
            {ep.essais > 1 ? (
              // Ne pas laisser croire à une fonction qui n'existe pas : le
              // plateau ne crée qu'un passage par athlète, et rouvrir un
              // passage REMPLACE le résultat au lieu d'ajouter un essai.
              <div
                style={{
                  fontSize: 12,
                  color: C.ambreEncre,
                  marginTop: 5,
                  lineHeight: 1.4,
                }}
              >
                Consigné au procès-verbal, mais pas encore géré au plateau :
                un seul passage par athlète est créé.
              </div>
            ) : null}
          </div>

          <div>
            <Etiquette>Passage</Etiquette>
            <ChoixListe
              valeur={ep.passage}
              title="Par groupe : les −100 kg passent, puis les +100 kg. Mélangé : tout le monde dans un seul ordre. Les classements restent séparés dans les deux cas."
              enregistrer={(v) => modifierEpreuve(ep.id, "passage", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            >
              <option value="groupe">Par groupe de poids</option>
              <option value="melange">Tout le monde mélangé</option>
            </ChoixListe>
          </div>
        </div>

        {/* ── Épreuve à niveaux ── */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 11,
            background: C.papier2,
          }}
        >
          <BoutonAction
            ton={ep.niveau ? "vert" : "blanc"}
            title="Épreuve à niveaux : chaque athlète déclare son niveau (hauteur de prise, cran, palier). Le niveau s'affiche sur sa fiche, à la sélection de l'épreuve et sur le mur LED pendant son passage."
            action={() => modifierEpreuve(ep.id, "niveau", !ep.niveau)}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              flex: "none",
            }}
          >
            {ep.niveau ? "Épreuve à niveaux" : "Sans niveau"}
          </BoutonAction>
          <div
            style={{
              flex: 1,
              minWidth: 180,
              fontSize: 12,
              color: C.encre3,
              lineHeight: 1.45,
              textWrap: "pretty",
            }}
          >
            {ep.niveau
              ? "Chaque athlète déclare son niveau sur sa fiche. Il est rappelé à la sélection de l'épreuve et affiché sur le mur LED pendant son passage."
              : "Pour une épreuve de tenue où la prise dépend de la taille de l'athlète — les Piliers d'Hercule par exemple — activez les niveaux."}
          </div>
          {ep.niveau ? (
            <div style={{ flex: "1 1 220px", minWidth: 180 }}>
              <ChampTexte
                valeur={ep.niveauxOptions ?? ""}
                placeholder="Niveau 1, Niveau 2, Niveau 3"
                title="Niveaux proposés, séparés par des virgules. Chaque athlète choisit le sien."
                enregistrer={(v) => modifierEpreuve(ep.id, "niveauxOptions", v)}
                style={{ padding: "9px 11px", background: C.blanc }}
              />
            </div>
          ) : null}
        </div>

        {ep.mesure === "nb_temps" && !ep.tours ? (
          <div style={{ marginTop: 14 }}>
            <Encart ton="ambre">
              Cette épreuve se classe au nombre de répétitions, et le temps de
              la dernière répétition départage les ex æquo — mais le comptage
              des tours est désactivé. Le juge devra saisir le nombre et ce
              temps à la main. Activez-le ci-dessous pour qu&apos;ils se remplissent
              seuls à chaque appui.
            </Encart>
          </div>
        ) : null}

        {/* ── Comptage des répétitions ── */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 10,
            padding: "12px 14px",
            borderRadius: 11,
            background: C.papier2,
          }}
        >
          <BoutonAction
            ton={ep.tours ? "vert" : "blanc"}
            title="Le juge compte les répétitions validées au bouton « Tour » pendant le passage : pierre chargée, pneu renversé, levée verrouillée."
            action={() => modifierEpreuve(ep.id, "tours", !ep.tours)}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              flex: "none",
            }}
          >
            {ep.tours ? "Comptage des tours" : "Sans comptage"}
          </BoutonAction>
          <div
            style={{
              flex: 1,
              minWidth: 180,
              fontSize: 12,
              color: C.encre3,
              lineHeight: 1.45,
              textWrap: "pretty",
            }}
          >
            Le compteur et le temps du dernier tour se remplissent alors tout
            seuls au plateau.
          </div>
        </div>

        {/* ── Medley ── */}
        {estMedley ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 11,
              background: C.ambreFond,
              border: `1px solid ${C.ambreBord}`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.ambreEncre,
                marginBottom: 4,
              }}
            >
              Medley — parcours à ateliers
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.ambreEncre,
                lineHeight: 1.5,
                marginBottom: 12,
                textWrap: "pretty",
              }}
            >
              Un medley enchaîne plusieurs agrès sur une même distance,
              chronométré du départ à la ligne d&apos;arrivée. Décrivez ici les
              ateliers dans l&apos;ordre, la distance de chaque portage et la
              règle de fin de temps.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))",
                gap: 12,
              }}
            >
              <div>
                <Etiquette>Ateliers dans l&apos;ordre</Etiquette>
                <ChampTexte
                  multiligne
                  rows={4}
                  valeur={ep.ateliers ?? ""}
                  title="Un atelier par ligne : agrès, charge et distance"
                  placeholder={"Yoke 350 kg — 15 m\nFarmer's walk 2×120 kg — 15 m\nSandbag 100 kg — 15 m"}
                  enregistrer={(v) => modifierEpreuve(ep.id, "ateliers", v)}
                  style={{ background: C.blanc, lineHeight: 1.5 }}
                />
              </div>
              <div>
                <Etiquette>Distance totale</Etiquette>
                <ChampTexte
                  valeur={ep.distanceTotale ?? ""}
                  placeholder="45 m"
                  title="Distance cumulée du parcours"
                  enregistrer={(v) =>
                    modifierEpreuve(ep.id, "distanceTotale", v)
                  }
                  style={{ background: C.blanc }}
                />
                <Etiquette style={{ margin: "12px 0 6px" }}>
                  Fin de temps
                </Etiquette>
                <ChampTexte
                  valeur={ep.regleFin ?? ""}
                  placeholder="Distance atteinte au coup de sifflet"
                  title="Ce qui est retenu si l'athlète n'achève pas le parcours"
                  enregistrer={(v) => modifierEpreuve(ep.id, "regleFin", v)}
                  style={{ background: C.blanc }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Critère de classement ── */}
        <div
          style={{
            marginTop: 16,
            borderLeft: `3px solid ${C.orange}`,
            padding: "10px 0 10px 14px",
            background: "rgba(236,109,35,.05)",
          }}
        >
          <Etiquette>Critère de classement</Etiquette>
          <ChampTexte
            multiligne
            rows={2}
            valeur={ep.critere ?? ""}
            title="Texte du règlement, rappelé au juge et au speaker avant chaque passage"
            enregistrer={(v) => modifierEpreuve(ep.id, "critere", v)}
            style={{
              padding: "9px 12px",
              borderRadius: 9,
              background: C.blanc,
              lineHeight: 1.5,
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
            gap: 14,
            marginTop: 14,
          }}
        >
          <div>
            <Etiquette>Matériel de compétition</Etiquette>
            <ChampTexte
              valeur={ep.materiel ?? ""}
              title="Matériel fourni par l'organisation, sert à la check-list de plateau"
              enregistrer={(v) => modifierEpreuve(ep.id, "materiel", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            />
          </div>
          <div>
            <Etiquette>Équipements personnels autorisés</Etiquette>
            <ChampTexte
              valeur={ep.equipements ?? ""}
              title="Équipements personnels autorisés, contrôlés à la vérification d'avant-pesée"
              enregistrer={(v) => modifierEpreuve(ep.id, "equipements", v)}
              style={{ padding: "10px 12px", borderRadius: 9 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
