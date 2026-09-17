import Link from "next/link";
import {
  C,
  LIBELLE_CHRONO,
  aCaseChrono,
  clubAffiche,
  libelleTemps,
  mesureMixte,
  nomComplet,
  performanceLisible,
  tempsImpartiLisible,
  uniteValeur,
  virgule,
} from "@/lib/charte";
import { versMesure } from "@/lib/classement";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  niveauxPour,
  officielsDe,
  ordrePour,
  passagesDe,
  tousLesResultats,
  type AthletePublic,
  type EpreuveVue,
} from "@/lib/donnees";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * La feuille de notation d'une épreuve — tous les athlètes, dans l'ordre de
 * passage, une ligne chacun.
 *
 * C'est ce que l'arbitre a en main sur le plateau : il remplit la performance
 * et le temps intermédiaire ligne à ligne, coche le verdict, et la table
 * reporte ensuite dans le logiciel. Une feuille par épreuve et par catégorie ;
 * en passage mélangé, une feuille par catégorie tout de même — les classements
 * ne se mélangent jamais, la feuille non plus.
 *
 * Même règle que la fiche par athlète : **les colonnes portent exactement les
 * intitulés du plateau**, tirés des mêmes fonctions. L'arbitre n'a rien à
 * traduire, et la table retrouve ses cases dans le même ordre.
 *
 * `?epreuve=<id>&categorie=<id|tous>` — les mêmes paramètres que le plateau,
 * pour que le bouton d'impression parte de l'écran où l'on est.
 */
export const dynamic = "force-dynamic";

const TOUS = "tous";

export default async function PageFeuilleEpreuve({
  searchParams,
}: {
  searchParams: Promise<{ epreuve?: string; categorie?: string }>;
}) {
  const { epreuve: epreuveQ, categorie: categorieQ } = await searchParams;
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Feuille de notation</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuvesCompl, categoriesToutes, athletes] = await Promise.all([
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);
  const categories = categoriesToutes.filter((c) => c.active);

  const epreuve =
    epreuvesCompl.find((e) => e.id === epreuveQ) ??
    epreuvesCompl.find((e) => e.id === comp.epreuveCouranteId) ??
    epreuvesCompl[0];

  if (!epreuve || categories.length === 0) {
    return (
      <>
        <FilAriane>Feuille de notation</FilAriane>
        <Encart ton="ambre">
          Il faut au moins une épreuve et une catégorie retenue.
        </Encart>
      </>
    );
  }

  // Même résolution que le plateau : l'URL, puis la base, puis le mode de
  // passage de l'épreuve.
  const demande = categorieQ ?? comp.categorieCouranteId ?? undefined;
  const groupeId =
    demande === TOUS
      ? TOUS
      : (categories.find((c) => c.id === demande)?.id ??
        (epreuve.passage === "melange" ? TOUS : categories[0].id));
  const enJeu =
    groupeId === TOUS ? categories : categories.filter((c) => c.id === groupeId);

  const vue: EpreuveVue[] = epreuvesCompl.map((e) => ({
    id: e.id,
    nom: e.nom,
    mesure: versMesure(e.mesure),
    tempsLimiteS: e.tempsLimiteS,
    essais: e.essais,
    critere: e.critere,
    position: e.position,
  }));
  const epVue = vue.find((e) => e.id === epreuve.id)!;

  const [resultats, niveaux, officiels] = await Promise.all([
    tousLesResultats(comp.id, vue),
    niveauxPour(comp.id, epreuve.id),
    officielsDe(comp.id),
  ]);
  /** Le nom de l'officiel d'un rôle pour une catégorie, sinon une ligne à remplir. */
  const nomDe = (categorieId: string, role: string) =>
    officiels.find(
      (o) =>
        o.nom.trim() &&
        o.role === role &&
        (o.categorieId === categorieId || o.categorieId === null),
    )?.nom ?? "________________________";

  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  /**
   * Les lignes d'une catégorie : la file réelle si elle existe (elle porte
   * l'ordre décidé au plateau, et les résultats déjà validés), sinon l'ordre
   * théorique — pour pouvoir imprimer AVANT d'avoir construit la file.
   */
  const feuilles = await Promise.all(
    enJeu.map(async (cat) => {
      const duGroupe = athletes.filter((a) => a.categorieId === cat.id);
      const passages = await passagesDe(
        epreuve.id,
        duGroupe.map((a) => a.id),
      );
      const parId = new Map(duGroupe.map((a) => [a.id, a]));

      const lignes =
        passages.length > 0
          ? [...passages]
              .sort((a, b) => a.ordre - b.ordre)
              .map((p) => ({
                athlete: parId.get(p.athleteId)!,
                statut: p.statut,
                resultat:
                  p.statut === "termine"
                    ? {
                        statut: p.resultatStatut,
                        valeur: p.valeur,
                        temps: p.tempsS,
                        chrono: p.chronoS,
                      }
                    : null,
              }))
              .filter((l) => l.athlete)
          : ordrePour(epVue, cat.id, vue, athletes, resultats).map((a) => ({
              athlete: a,
              statut: "avenir" as const,
              resultat: null,
            }));

      return { categorie: cat, lignes, fileConstruite: passages.length > 0 };
    }),
  );

  const ancre =
    `/admin/plateau?epreuve=${epreuve.id}&categorie=${groupeId}`;

  return (
    <>
      {/* Cette feuille est un tableau large : le paysage lui va mieux. */}
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>

      <FilAriane>
        Feuille de notation · {epreuve.nom}
      </FilAriane>

      <div
        className="ne-pas-imprimer"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <BoutonImprimer nombre={1} />
        <Link
          href={ancre}
          style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}
        >
          ← Retour au plateau
        </Link>
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Une feuille A4 paysage par catégorie. L&apos;arbitre remplit ligne à
          ligne ; la table reporte ensuite au plateau — les colonnes portent les
          intitulés exacts de l&apos;écran de saisie.
        </div>
      </div>

      {feuilles.map((f) => (
        <Feuille
          key={f.categorie.id}
          epreuve={epreuve}
          mesure={epVue.mesure}
          categorieNom={f.categorie.nom}
          lignes={f.lignes}
          fileConstruite={f.fileConstruite}
          niveaux={niveaux}
          date={dateTexte}
          lieu={comp.lieu ?? ""}
          staff={{
            juge: nomDe(f.categorie.id, "juge"),
            chrono: nomDe(f.categorie.id, "chrono"),
            secretaire: nomDe(f.categorie.id, "secretaire"),
          }}
        />
      ))}
    </>
  );
}

/* ── Une feuille ──────────────────────────────────────────────────────── */

interface Ligne {
  athlete: AthletePublic;
  statut: "avenir" | "plateau" | "a_saisir" | "termine";
  resultat: {
    statut: "ok" | "zero" | "forfait" | null;
    valeur: number | null;
    temps: number | null;
    chrono: number | null;
  } | null;
}

const th: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: C.encre2,
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: `2px solid ${C.encre}`,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "9px 6px",
  borderBottom: `1px solid ${C.bordure2}`,
  verticalAlign: "middle",
  fontSize: 14,
};

/** Une case blanche à remplir, ou la valeur déjà validée, grisée. */
function Champ({
  prerempli,
  largeur,
}: {
  prerempli: string | null;
  largeur: number;
}) {
  return (
    <div
      style={{
        width: largeur,
        height: 38,
        border: `1.5px solid ${prerempli === null ? C.encre : C.bordure2}`,
        borderRadius: 5,
        background: prerempli === null ? C.blanc : C.papier2,
        color: C.encre3,
        fontSize: 14,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {prerempli ?? ""}
    </div>
  );
}

function Coche({ libelle, cochee }: { libelle: string; cochee?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        marginRight: 10,
      }}
    >
      <span
        style={{
          width: 15,
          height: 15,
          border: `1.5px solid ${C.encre}`,
          borderRadius: 3,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        {cochee ? "✕" : ""}
      </span>
      {libelle}
    </span>
  );
}

function Feuille({
  epreuve,
  mesure,
  categorieNom,
  lignes,
  fileConstruite,
  niveaux,
  date,
  lieu,
  staff,
}: {
  epreuve: Awaited<ReturnType<typeof epreuvesCompletes>>[number];
  mesure: string;
  categorieNom: string;
  lignes: Ligne[];
  fileConstruite: boolean;
  niveaux: Record<string, string>;
  date: string;
  lieu: string;
  /** Les officiels affectés à la catégorie, ou une ligne à remplir. */
  staff: { juge: string; chrono: string; secretaire: string };
}) {
  const mixte = mesureMixte(mesure);

  return (
    <article
      className="fiche-papier"
      style={{
        background: C.blanc,
        border: `1px solid ${C.bordure}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
        color: C.encre,
      }}
    >
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingBottom: 8,
          borderBottom: `2px solid ${C.encre}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fibda.jpg"
          alt="FIBDA"
          style={{ width: 40, height: 40, objectFit: "contain", flex: "none" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.encre3,
            }}
          >
            Championnat National de Strongman 2026 · Feuille de notation
            {date ? ` · ${date}` : ""}
            {lieu ? ` · ${lieu}` : ""}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>
            {epreuve.nom}
            <span style={{ color: C.orange }}> · {categorieNom}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.encre3 }}>
              {" "}
              · {tempsImpartiLisible(epreuve.tempsLimiteS)}
            </span>
          </div>
          {epreuve.critere ? (
            <div
              style={{
                fontSize: 12,
                color: C.encre3,
                fontStyle: "italic",
                marginTop: 2,
              }}
            >
              {epreuve.critere}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.encre3,
            textAlign: "right",
            flex: "none",
            lineHeight: 1.6,
          }}
        >
          {lignes.length} athlète{lignes.length > 1 ? "s" : ""}
          <br />
          {fileConstruite
            ? "ordre de passage du plateau"
            : "ordre théorique — file non construite"}
        </div>
      </div>

      {/* Le tableau */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 8,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...th, width: 28 }}>Ordre</th>
            <th style={{ ...th, width: 44 }}>Dossard</th>
            <th style={th}>Athlète</th>
            <th style={th}>Club · poids</th>
            {epreuve.niveau ? <th style={th}>Niveau</th> : null}
            <th style={th}>{uniteValeur(mesure)}</th>
            {mixte ? <th style={th}>{libelleTemps(mesure)}</th> : null}
            {aCaseChrono(mesure) ? <th style={th}>{LIBELLE_CHRONO}</th> : null}
            {epreuve.tours ? <th style={th}>Tours (barrer à chaque répétition)</th> : null}
            <th style={th}>Verdict</th>
            <th style={{ ...th, width: 90 }}>Juge</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            const a = l.athlete;
            const r = l.resultat;
            const valide = r?.statut === "ok";
            const preValeur = valide
              ? performanceLisible(mesure, r!.valeur, null)
              : null;
            const preTemps =
              valide && r!.temps !== null ? virgule(r!.temps) : null;

            return (
              <tr key={a.id}>
                <td style={{ ...td, fontWeight: 700, color: C.encre4 }}>
                  {i + 1}
                </td>
                <td style={{ ...td, fontWeight: 700, fontSize: 18 }}>
                  {a.dossard ?? "—"}
                </td>
                <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {nomComplet(a)}
                  {a.horsClassement ? (
                    <span
                      style={{
                        fontSize: 9,
                        color: C.orangeFonce,
                        marginLeft: 6,
                      }}
                    >
                      INVITÉ
                    </span>
                  ) : null}
                </td>
                <td style={{ ...td, fontSize: 12, color: C.encre3 }}>
                  {clubAffiche(a.club)}
                  {a.poidsCorps !== null ? ` · ${virgule(a.poidsCorps)} kg` : ""}
                </td>
                {epreuve.niveau ? (
                  <td style={{ ...td, fontSize: 13 }}>
                    {niveaux[a.id] ?? "________"}
                  </td>
                ) : null}
                <td style={td}>
                  <Champ prerempli={preValeur} largeur={mixte ? 90 : 120} />
                </td>
                {mixte ? (
                  <td style={td}>
                    <Champ prerempli={preTemps} largeur={90} />
                  </td>
                ) : null}
                {aCaseChrono(mesure) ? (
                  <td style={td}>
                    <Champ
                      prerempli={
                        valide && r!.chrono !== null ? virgule(r!.chrono) : null
                      }
                      largeur={80}
                    />
                  </td>
                ) : null}
                {epreuve.tours ? (
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {Array.from({ length: 20 }).map((_, k) => (
                      <span
                        key={k}
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          border: `1px solid ${C.encre3}`,
                          borderRadius: 3,
                          marginRight: 3,
                          verticalAlign: "middle",
                        }}
                      />
                    ))}
                  </td>
                ) : null}
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <Coche libelle="Validé" cochee={r?.statut === "ok"} />
                  <Coche libelle="Zéro" cochee={r?.statut === "zero"} />
                  <Coche libelle="Forfait" cochee={r?.statut === "forfait"} />
                </td>
                <td style={{ ...td, color: C.encre4 }}>__________</td>
              </tr>
            );
          })}
          {lignes.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ ...td, color: C.encre4 }}>
                Aucun athlète rattaché à cette catégorie.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Pied */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          marginTop: 12,
          paddingTop: 8,
          borderTop: `2px solid ${C.encre}`,
          fontSize: 12,
          color: C.encre2,
        }}
      >
        <span>Juge principal : {staff.juge}</span>
        <span>Chronométreur : {staff.chrono}</span>
        <span>Secrétaire de table : {staff.secretaire}</span>
        <span style={{ marginLeft: "auto" }}>
          Reporté dans le logiciel le ________ par ____________
        </span>
      </div>
    </article>
  );
}
