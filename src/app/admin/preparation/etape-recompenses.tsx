"use client";

import Link from "next/link";
import {
  C,
  METAUX,
  POINTS_CLUB_LISIBLE,
  clubAffiche,
  couleurMetal,
  nomComplet,
} from "@/lib/charte";
import { TitreSection } from "@/components/chrome";
import { Encart, Etiquette, styleBouton } from "@/components/ui";
import { BoutonAction, ChampTexte } from "@/components/saisie";
import {
  ajouterRecompense,
  enregistrerPartenaires,
  enregistrerRecompenseClub,
  modifierRecompense,
  personnaliserRecompenses,
  retablirRecompenses,
  supprimerRecompense,
} from "@/lib/actions";
import type { Recompense } from "@/lib/db/schema";
import type { CategorieVue } from "@/lib/donnees";
import { recompensesPour } from "@/lib/classement";
import type { Palmares } from "@/lib/palmares";

/** Le rang, en toutes lettres : « 1ère place », « 2e place »… */
const libRang = (i: number): string =>
  i === 0 ? "1ère place" : `${i + 1}e place`;

/**
 * Étape 7 — les récompenses, par catégorie, puis le meilleur club et les
 * partenaires.
 *
 * Chaque catégorie retenue a son bloc : ses propres places dotées, ou les
 * récompenses communes tant qu'elle n'en a pas. À côté de chaque place, le
 * lauréat calculé depuis le classement. Rien ici n'alimente le classement :
 * l'écran podium, le palmarès imprimé et le bandeau de l'écran d'attente.
 */
export function EtapeRecompenses({
  competitionId,
  recompenses,
  categories,
  partenaires,
  recompenseClub,
  palmares,
}: {
  competitionId: string;
  recompenses: Recompense[];
  categories: CategorieVue[];
  partenaires: string;
  recompenseClub: string;
  palmares: Palmares;
}) {
  const retenues = categories.filter((c) => c.active);
  const communes = recompenses.filter((r) => r.categorieId === null);
  const meilleurClub = palmares.clubs[0] ?? null;
  const laureat = (categorieId: string, rang: number) =>
    palmares.categories
      .find((c) => c.id === categorieId)
      ?.laureats.find((l) => l.rang === rang) ?? null;

  return (
    <div>
      <TitreSection
        debut="Récompenses"
        suite="par catégorie"
        chapeau="Titres, primes et lots de chaque place, catégorie par catégorie : ce que montre l'écran podium et ce que signe le palmarès. Les lauréats se lisent ici dès que le classement commence."
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

      {retenues.length === 0 ? (
        <Encart ton="ambre">
          Aucune catégorie retenue : les récompenses se dotent après l&apos;étape Groupes.
        </Encart>
      ) : null}

      {/* ── Un bloc par catégorie retenue ── */}
      {retenues.map((cat) => {
        const { lignes, propres } = recompensesPour(recompenses, cat.id);
        return (
          <div
            key={cat.id}
            style={{
              background: C.blanc,
              border: `1px solid ${C.bordure}`,
              borderTop: `5px solid ${cat.couleur}`,
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{cat.nom}</div>
              <div style={{ fontSize: 13, color: propres ? C.encre3 : C.ambreEncre }}>
                {propres
                  ? `${lignes.length} place${lignes.length > 1 ? "s" : ""} dotée${lignes.length > 1 ? "s" : ""}, propres à cette catégorie`
                  : lignes.length > 0
                    ? "Utilise les récompenses communes ci-dessous"
                    : "Aucune place dotée"}
              </div>
            </div>

            {propres ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {lignes.map((r, i) => (
                    <LigneRecompense
                      key={r.id}
                      r={r}
                      i={i}
                      laureat={laureat(cat.id, i + 1)}
                      commence={palmares.commence}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  <BoutonAction
                    ton="pointille"
                    title="Ajoute une place récompensée dans cette catégorie"
                    action={() => ajouterRecompense(competitionId, cat.id)}
                  >
                    + Ajouter une place
                  </BoutonAction>
                  <BoutonAction
                    ton="blanc"
                    title="Revient aux trois médailles et primes officielles pour cette catégorie"
                    confirmation={`Rétablir les trois médailles officielles pour « ${cat.nom} » ? Les récompenses saisies pour cette catégorie sont remplacées.`}
                    action={() => retablirRecompenses(competitionId, cat.id)}
                  >
                    Rétablir les valeurs officielles
                  </BoutonAction>
                </div>
              </>
            ) : (
              <>
                {lignes.map((r, i) => {
                  const l = laureat(cat.id, i + 1);
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                        padding: "8px 12px",
                        borderLeft: `5px solid ${couleurMetal(i)}`,
                        background: C.papier2,
                        borderRadius: 9,
                        marginBottom: 6,
                        fontSize: 14,
                      }}
                    >
                      <span style={{ width: 80, fontWeight: 700, color: couleurMetal(i), flex: "none" }}>{libRang(i)}</span>
                      <span style={{ flex: "1 1 200px" }}>
                        <strong>{r.titre || METAUX[i] || "Distinction"}</strong>
                        {r.prime ? <span style={{ color: C.vertFonce, fontWeight: 700 }}> · {r.prime}</span> : null}
                        {r.lot ? <span style={{ color: C.encre3 }}> · {r.lot}</span> : null}
                      </span>
                      <Laureat l={l} commence={palmares.commence} />
                    </div>
                  );
                })}
                <BoutonAction
                  ton="noir"
                  title="Donne à cette catégorie ses propres récompenses, copiées des communes : les modifier ne touchera plus les autres catégories"
                  action={() => personnaliserRecompenses(competitionId, cat.id)}
                  style={{ marginTop: 8, padding: "10px 16px", borderRadius: 9 }}
                >
                  Personnaliser pour {cat.nom}
                </BoutonAction>
              </>
            )}
          </div>
        );
      })}

      {/* ── Récompenses communes ── */}
      <div
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Récompenses communes
        </div>
        <div style={{ fontSize: 13, color: C.encre3, lineHeight: 1.5, marginBottom: 14, textWrap: "pretty" }}>
          Servent à toute catégorie qui n&apos;a pas ses propres récompenses.
          {retenues.every((c) => recompensesPour(recompenses, c.id).propres) && retenues.length > 0
            ? " Aucune catégorie ne s'en sert actuellement."
            : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {communes.map((r, i) => (
            <LigneRecompense key={r.id} r={r} i={i} laureat={null} commence={false} sansLaureat />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <BoutonAction
            ton="pointille"
            title="Ajoute une place récompensée commune"
            action={() => ajouterRecompense(competitionId, null)}
          >
            + Ajouter une place
          </BoutonAction>
          <BoutonAction
            ton="blanc"
            title="Revient aux trois médailles et primes officielles"
            confirmation="Rétablir les trois médailles et primes officielles communes ? Les récompenses communes saisies sont remplacées ; celles des catégories ne bougent pas."
            action={() => retablirRecompenses(competitionId, null)}
          >
            Rétablir les valeurs officielles
          </BoutonAction>
        </div>
      </div>

      {/* ── Meilleur club ── */}
      <div
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderLeft: `5px solid ${C.orange}`,
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 16,
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
        <div style={{ fontSize: 13, color: C.encre4, marginTop: 7, lineHeight: 1.45 }}>
          Affiché sur l&apos;écran d&apos;attente et entre les passages.
        </div>
      </div>
    </div>
  );
}

/** Le lauréat d'une place, ou la raison pour laquelle il n'y en a pas encore. */
function Laureat({
  l,
  commence,
}: {
  l: Palmares["categories"][number]["laureats"][number] | null;
  commence: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 8,
        background: C.blanc,
        border: `1px solid ${C.bordure}`,
        fontSize: 12,
        flex: "none",
      }}
    >
      {l ? (
        <span style={{ fontWeight: 700, color: C.encre }}>
          {nomComplet(l)}
          <span style={{ fontWeight: 500, color: C.encre3 }}> · {clubAffiche(l.club)} · {l.total} pts</span>
        </span>
      ) : (
        <span style={{ color: C.encre4 }}>{commence ? "personne à ce rang" : "pas encore classé"}</span>
      )}
    </span>
  );
}

/** Une place dotée, modifiable : titre, prime, lot, et son lauréat. */
function LigneRecompense({
  r,
  i,
  laureat,
  commence,
  sansLaureat = false,
}: {
  r: Recompense;
  i: number;
  laureat: Palmares["categories"][number]["laureats"][number] | null;
  commence: boolean;
  sansLaureat?: boolean;
}) {
  const couleur = couleurMetal(i);
  return (
    <div
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
      <div style={{ flex: "none", width: 80, fontSize: 14, fontWeight: 700, color: couleur }}>
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
        style={{ flex: "none", padding: "9px 13px", borderRadius: 8, fontSize: 13 }}
      >
        Retirer
      </BoutonAction>
      {sansLaureat ? null : (
        <div style={{ flex: "1 1 100%", paddingTop: 8, borderTop: `1px dashed ${C.papier3}` }}>
          <Laureat l={laureat} commence={commence} />
        </div>
      )}
    </div>
  );
}
