"use client";

import { C, ROLES } from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { BoutonAction, ChampTexte, ChoixListe } from "@/components/saisie";
import {
  ajouterOfficiel,
  modifierOfficiel,
  supprimerOfficiel,
} from "@/lib/actions";
import type { Officiel } from "@/lib/db/schema";
import type { CategorieVue } from "@/lib/donnees";
import Link from "next/link";
import { Encart, Etiquette, styleBouton } from "@/components/ui";

/**
 * Étape 3 — les officiels et le corps arbitral.
 *
 * Purement nominatif : ces noms vont sur la feuille de notation et au
 * procès-verbal. L'accès au logiciel ne passe PAS par cette liste — le poste
 * d'origine y rangeait les deux codes parce qu'il n'avait pas de serveur ;
 * ici le code est vérifié côté serveur et se règle à l'installation.
 */
export function EtapeOfficiels({
  competitionId,
  officiels,
  categories,
}: {
  competitionId: string;
  officiels: Officiel[];
  categories: CategorieVue[];
}) {
  const nommes = officiels.filter((o) => o.nom.trim());
  const compte = (role: string) =>
    nommes.filter((o) => o.role === role).length;

  /**
   * Un staff par catégorie : chaque catégorie retenue doit avoir au moins un
   * juge principal qui lui est affecté. Un officiel « toutes catégories »
   * compte pour toutes.
   */
  const retenues = categories.filter((c) => c.active);
  const staffDe = (categorieId: string) =>
    nommes.filter((o) => o.categorieId === categorieId || o.categorieId === null);
  const jugesDe = (categorieId: string) =>
    staffDe(categorieId).filter((o) => o.role === "juge").length;
  const sansJuge = retenues.filter((c) => jugesDe(c.id) === 0);

  const manques: string[] = [];
  if (compte("juge") < 5)
    manques.push(`${5 - compte("juge")} juge(s) principal(aux)`);
  if (compte("technique") < 2)
    manques.push(`${2 - compte("technique")} responsable(s) technique(s)`);
  if (compte("chrono") < 1) manques.push("un chronométreur");
  if (compte("secretaire") < 1) manques.push("un secrétaire de table");

  return (
    <div>
      <TitreSection
        debut="Officiels"
        suite="et corps arbitral"
        chapeau="Minimum réglementaire : cinq arbitres principaux, deux responsables techniques, des chronométreurs et un secrétaire de table. Les juges valident l'essai sur le terrain et n'ont rien à saisir : la table enregistre la performance. Leurs noms servent à la feuille de notation et au procès-verbal."
      />

      <div
        style={{
          background: C.blanc,
          border: `2px solid ${C.encre}`,
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Code d&apos;accès du logiciel
        </div>
        <div
          style={{
            fontSize: 14,
            color: C.encre3,
            lineHeight: 1.5,
            textWrap: "pretty",
          }}
        >
          Contrairement au poste autonome, le code n&apos;est plus rangé dans la
          compétition : il est vérifié par le serveur et ne circule jamais
          jusqu&apos;au navigateur. Il se règle à l&apos;installation, avec{" "}
          <code
            style={{
              background: C.papier2,
              padding: "2px 6px",
              borderRadius: 5,
            }}
          >
            pnpm run motdepasse
          </code>
          , puis en reportant l&apos;empreinte obtenue dans la variable{" "}
          <code
            style={{
              background: C.papier2,
              padding: "2px 6px",
              borderRadius: 5,
            }}
          >
            ADMIN_PASSWORD_HASH
          </code>
          . Le changer déconnecte immédiatement tous les postes ouverts.
        </div>
      </div>

      {/* ── Un staff par catégorie ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {retenues.map((c) => {
          const staff = staffDe(c.id);
          const juges = jugesDe(c.id);
          return (
            <div
              key={c.id}
              style={{
                background: C.blanc,
                border: `1px solid ${juges === 0 ? C.ambreBord : C.bordure}`,
                borderTop: `4px solid ${c.couleur}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <Etiquette>Staff arbitral</Etiquette>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c.nom}</div>
              <div style={{ fontSize: 13, color: juges === 0 ? C.ambreEncre : C.encre3, marginTop: 4, lineHeight: 1.45 }}>
                {juges === 0
                  ? "Aucun juge principal affecté."
                  : `${juges} juge${juges > 1 ? "s" : ""} principal${juges > 1 ? "aux" : ""}, ${staff.length} officiel${staff.length > 1 ? "s" : ""} au total`}
              </div>
              {staff
                .filter((o) => o.categorieId === c.id)
                .map((o) => (
                  <div key={o.id} style={{ fontSize: 12, color: C.encre2, marginTop: 2 }}>
                    · {o.nom} — {ROLES.find((r) => r.cle === o.role)?.lbl ?? o.role}
                  </div>
                ))}
            </div>
          );
        })}
        {retenues.length === 0 ? (
          <Encart ton="ambre">
            Aucune catégorie retenue : affectez le staff après l&apos;étape Groupes.
          </Encart>
        ) : null}
      </div>
      {sansJuge.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          <Encart ton="ambre">
            Il faut un staff par catégorie. Sans juge principal :{" "}
            {sansJuge.map((c) => c.nom).join(", ")}. Affectez chaque officiel à
            sa catégorie dans la liste ci-dessous.
          </Encart>
        </div>
      ) : null}

      <div
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {officiels.map((o) => (
          <div
            key={o.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              padding: "12px 18px",
              borderTop: `1px solid ${C.papier3}`,
              alignItems: "center",
            }}
          >
            <div style={{ flex: "2 1 220px", minWidth: 170 }}>
              <ChampTexte
                valeur={o.nom}
                placeholder="Nom, prénoms"
                title="Nom porté sur la feuille de notation et le procès-verbal"
                enregistrer={(v) => modifierOfficiel(o.id, "nom", v)}
              />
            </div>
            <div style={{ flex: "2 1 200px", minWidth: 160 }}>
              <ChoixListe
                valeur={o.role}
                title="Le rôle décide de ce que la personne signe et de sa place au procès-verbal"
                enregistrer={(v) => modifierOfficiel(o.id, "role", v)}
              >
                {ROLES.map((r) => (
                  <option key={r.cle} value={r.cle}>
                    {r.lbl}
                  </option>
                ))}
              </ChoixListe>
            </div>
            <div style={{ flex: "2 1 200px", minWidth: 160 }}>
              <ChoixListe
                valeur={o.categorieId ?? ""}
                title="La catégorie que cet officiel arbitre. Un staff par catégorie ; « Toutes » pour les postes communs (directeur, speaker, régie)"
                enregistrer={(v) => modifierOfficiel(o.id, "categorieId", v)}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                    {c.active ? "" : " (mise de côté)"}
                  </option>
                ))}
              </ChoixListe>
            </div>
            <BoutonAction
              ton="rouge"
              title="Retire cet officiel"
              action={() => supprimerOfficiel(o.id)}
              style={{
                flex: "0 0 auto",
                padding: "9px 14px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Retirer
            </BoutonAction>
          </div>
        ))}
        {officiels.length === 0 ? (
          <div
            style={{
              padding: "20px 18px",
              fontSize: 14,
              color: C.encre4,
              lineHeight: 1.5,
            }}
          >
            Aucun officiel déclaré. Le procès-verbal ne pourra pas être signé.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <BoutonAction
          ton="pointille"
          title="Ajoute un officiel : juge, chronométreur, secrétaire, régie, speaker"
          action={() => ajouterOfficiel(competitionId)}
          style={{ padding: "12px 20px" }}
        >
          + Ajouter un officiel
        </BoutonAction>
        <Link
          href="/admin/impression/officiels"
          title="La liste des officiels à signer, postes communs puis staff de chaque catégorie"
          style={styleBouton("creme", { padding: "11px 16px", borderRadius: 9 })}
        >
          Imprimer la liste des officiels
        </Link>
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 13,
          color: C.encre4,
          lineHeight: 1.5,
        }}
      >
        {manques.length === 0
          ? `Corps arbitral complet : ${nommes.length} officiels nommés.`
          : `Il manque encore ${manques.join(", ")}.`}
      </div>
    </div>
  );
}
