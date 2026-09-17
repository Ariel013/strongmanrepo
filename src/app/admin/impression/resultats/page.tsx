import Link from "next/link";
import {
  C,
  clubAffiche,
  nomComplet,
  performanceLisible,
  tempsImpartiLisible,
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
  passagesDe,
  tableauEpreuve,
  tousLesResultats,
  type AthletePublic,
  type EpreuveVue,
} from "@/lib/donnees";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * Les résultats d'une épreuve, classés par catégorie — la pièce à signer.
 *
 * Une feuille A4 portrait par catégorie : rang, dossard, athlète, performance,
 * points, puis les zéros, forfaits et athlètes non passés en dessous du
 * classement, sans rang. Le classement est **recalculé** depuis les résultats
 * validés, jamais recopié depuis un écran : c'est la même fonction que le
 * plateau et le mur LED.
 *
 * La feuille dit si elle est définitive ou provisoire : tant qu'un passage
 * reste à venir, au plateau ou en attente de résultat, le rang peut bouger.
 *
 * `?epreuve=<id>&categorie=<id|tous>` — les paramètres du plateau.
 */
export const dynamic = "force-dynamic";

const TOUS = "tous";

export default async function PageResultats({
  searchParams,
}: {
  searchParams: Promise<{ epreuve?: string; categorie?: string }>;
}) {
  const { epreuve: epreuveQ, categorie: categorieQ } = await searchParams;
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Résultats</FilAriane>
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
        <FilAriane>Résultats</FilAriane>
        <Encart ton="ambre">
          Il faut au moins une épreuve et une catégorie retenue.
        </Encart>
      </>
    );
  }

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
  const resultats = await tousLesResultats(comp.id, vue);

  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const feuilles = await Promise.all(
    enJeu.map(async (cat) => {
      const duGroupe = athletes.filter((a) => a.categorieId === cat.id);
      const parId = new Map(duGroupe.map((a) => [a.id, a]));
      const passages = await passagesDe(
        epreuve.id,
        duGroupe.map((a) => a.id),
      );
      const passageDe = new Map(passages.map((p) => [p.athleteId, p]));
      const tableau = tableauEpreuve(epVue, cat.id, athletes, resultats);

      const classes: Ligne[] = tableau.lignes
        .filter((l) => l.rang !== null)
        .sort((a, b) => a.rang! - b.rang!)
        .map((l) => ({
          athlete: parId.get(l.athleteId)!,
          rang: l.rang,
          points: l.points,
          perf: performanceLisible(
            epVue.mesure,
            l.resultat?.valeur ?? null,
            l.resultat?.temps ?? null,
          ),
          mention: null,
        }))
        .filter((l) => l.athlete);

      // Sous le classement : ceux qui n'ont pas de rang, et pourquoi.
      const sansRang: Ligne[] = duGroupe
        .filter((a) => !classes.some((l) => l.athlete.id === a.id))
        .map((a) => {
          const p = passageDe.get(a.id);
          const mention = a.horsClassement
            ? "Invité, hors classement"
            : !p
              ? "Pas de passage"
              : p.statut === "termine"
                ? p.resultatStatut === "forfait"
                  ? "Forfait"
                  : "Zéro"
                : p.statut === "a_saisir"
                  ? "Résultat en attente du jury"
                  : p.statut === "plateau"
                    ? "Au plateau"
                    : "À venir";
          return { athlete: a, rang: null, points: 0, perf: "—", mention };
        });

      const restants = passages.filter((p) => p.statut !== "termine").length;
      return { categorie: cat, classes, sansRang, restants };
    }),
  );

  const ancre = `/admin/plateau?epreuve=${epreuve.id}&categorie=${groupeId}`;

  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 12mm; }`}</style>

      <FilAriane>Résultats · {epreuve.nom}</FilAriane>

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
          Une feuille par catégorie, classement recalculé depuis les passages
          validés. Elle se dit provisoire tant qu&apos;un passage reste à faire.
        </div>
      </div>

      {feuilles.map((f) => (
        <Feuille
          key={f.categorie.id}
          epreuve={epreuve}
          mesure={epVue.mesure}
          categorieNom={f.categorie.nom}
          classes={f.classes}
          sansRang={f.sansRang}
          restants={f.restants}
          date={dateTexte}
          lieu={comp.lieu ?? ""}
        />
      ))}
    </>
  );
}

/* ── Une feuille ──────────────────────────────────────────────────────── */

interface Ligne {
  athlete: AthletePublic;
  rang: number | null;
  points: number;
  perf: string;
  mention: string | null;
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

function Feuille({
  epreuve,
  mesure,
  categorieNom,
  classes,
  sansRang,
  restants,
  date,
  lieu,
}: {
  epreuve: Awaited<ReturnType<typeof epreuvesCompletes>>[number];
  mesure: string;
  categorieNom: string;
  classes: Ligne[];
  sansRang: Ligne[];
  restants: number;
  date: string;
  lieu: string;
}) {
  const definitif = restants === 0;

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
            Championnat National de Strongman 2026 · Résultats d&apos;épreuve
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
        </div>
        <div
          style={{
            flex: "none",
            padding: "6px 12px",
            borderRadius: 8,
            border: `1.5px solid ${definitif ? C.vertFonce : C.orangeFonce}`,
            color: definitif ? C.vertFonce : C.orangeFonce,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {definitif ? "Résultats définitifs" : "Résultats provisoires"}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>
            {definitif
              ? `${classes.length} classé${classes.length > 1 ? "s" : ""}`
              : `${restants} passage${restants > 1 ? "s" : ""} encore à faire`}
          </div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 40 }}>Rang</th>
            <th style={{ ...th, width: 56 }}>Dossard</th>
            <th style={th}>Athlète</th>
            <th style={th}>Club · poids</th>
            <th style={th}>Performance</th>
            <th style={{ ...th, width: 60, textAlign: "right" }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((l) => (
            <tr key={l.athlete.id}>
              <td style={{ ...td, fontWeight: 700, fontSize: 18, color: C.orange }}>
                {l.rang}
              </td>
              <td style={{ ...td, fontWeight: 700 }}>{l.athlete.dossard ?? "—"}</td>
              <td style={{ ...td, fontWeight: 600 }}>{nomComplet(l.athlete)}</td>
              <td style={{ ...td, fontSize: 12, color: C.encre3 }}>
                {clubAffiche(l.athlete.club)}
                {l.athlete.poidsCorps !== null
                  ? ` · ${virgule(l.athlete.poidsCorps)} kg`
                  : ""}
              </td>
              <td style={{ ...td, fontWeight: 700 }}>{l.perf}</td>
              <td style={{ ...td, fontWeight: 700, textAlign: "right" }}>{l.points}</td>
            </tr>
          ))}
          {classes.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...td, color: C.encre4 }}>
                Aucun passage validé avec une performance dans cette catégorie.
              </td>
            </tr>
          ) : null}
          {sansRang.map((l) => (
            <tr key={l.athlete.id}>
              <td style={{ ...td, color: C.encre4 }}>—</td>
              <td style={{ ...td, fontWeight: 700, color: C.encre3 }}>
                {l.athlete.dossard ?? "—"}
              </td>
              <td style={{ ...td, color: C.encre3 }}>{nomComplet(l.athlete)}</td>
              <td style={{ ...td, fontSize: 12, color: C.encre4 }}>
                {clubAffiche(l.athlete.club)}
              </td>
              <td style={{ ...td, fontSize: 12, fontStyle: "italic", color: C.encre3 }} colSpan={2}>
                {l.mention}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          marginTop: 16,
          paddingTop: 8,
          borderTop: `2px solid ${C.encre}`,
          fontSize: 12,
          color: C.encre2,
        }}
      >
        <span>Juge principal : ________________________</span>
        <span>Directeur technique : ________________________</span>
        <span style={{ marginLeft: "auto" }}>
          Barème {mesure === "chrono" ? "au temps le plus court" : "à la performance la plus haute"} · imprimé le{" "}
          {new Date().toLocaleDateString("fr-FR")}
        </span>
      </div>
    </article>
  );
}
