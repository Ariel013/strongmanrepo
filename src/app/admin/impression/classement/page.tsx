import Link from "next/link";
import { C, clubAffiche, nomComplet, virgule } from "@/lib/charte";
import { versMesure } from "@/lib/classement";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  passagesDe,
  tableauGeneral,
  tousLesResultats,
  type EpreuveVue,
} from "@/lib/donnees";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * Le classement général complet — TOUS les athlètes de TOUTES les catégories
 * retenues, du premier au dernier, avec les points de chaque épreuve.
 *
 * Le palmarès ne montre que les places dotées (les trois premiers) ; la
 * feuille de résultats ne montre qu'une épreuve. Celle-ci est la pièce que
 * les clubs et les athlètes demandent en fin de journée : où ai-je fini, et
 * avec quels points.
 *
 * Une feuille A4 paysage par catégorie. Recalculée par `tableauGeneral`, la
 * même fonction que le plateau et le mur LED — jamais recopiée d'un écran.
 * Elle se dit provisoire tant qu'un passage reste à faire ou à saisir.
 *
 * `?categorie=<id>` n'imprime qu'une catégorie ; sans paramètre, toutes.
 */
export const dynamic = "force-dynamic";

const th: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  color: C.encre2,
  textAlign: "left",
  padding: "7px 5px",
  borderBottom: `2px solid ${C.encre}`,
  verticalAlign: "bottom",
  lineHeight: 1.25,
};

const td: React.CSSProperties = {
  padding: "8px 5px",
  borderBottom: `1px solid ${C.bordure2}`,
  verticalAlign: "middle",
  fontSize: 13,
};

export default async function PageClassementComplet({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie: categorieQ } = await searchParams;
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Classement général</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuvesCompl, categoriesToutes, athletes] = await Promise.all([
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
  ]);
  const retenues = categoriesToutes.filter((c) => c.active);
  const categories = retenues.some((c) => c.id === categorieQ)
    ? retenues.filter((c) => c.id === categorieQ)
    : retenues;

  if (epreuvesCompl.length === 0 || categories.length === 0) {
    return (
      <>
        <FilAriane>Classement général</FilAriane>
        <Encart ton="ambre">
          Il faut au moins une épreuve et une catégorie retenue.
        </Encart>
      </>
    );
  }

  const vue: EpreuveVue[] = epreuvesCompl.map((e) => ({
    id: e.id,
    nom: e.nom,
    mesure: versMesure(e.mesure),
    tempsLimiteS: e.tempsLimiteS,
    essais: e.essais,
    critere: e.critere,
    position: e.position,
  }));
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
    categories.map(async (cat) => {
      const duGroupe = athletes.filter((a) => a.categorieId === cat.id);
      const parId = new Map(duGroupe.map((a) => [a.id, a]));
      const tableau = tableauGeneral(cat, vue, athletes, resultats);

      // Ce qui reste à faire : un passage non validé, ou un athlète classable
      // qui n'a pas de passage du tout dans une épreuve.
      const classables = duGroupe.filter((a) => !a.horsClassement);
      let restants = 0;
      for (const ep of vue) {
        const passages = await passagesDe(
          ep.id,
          classables.map((a) => a.id),
        );
        const valides = passages.filter((p) => p.statut === "termine").length;
        restants += classables.length - valides;
      }

      const classes = tableau.lignes
        .filter((l) => parId.has(l.athleteId))
        .sort((a, b) => a.rang - b.rang);
      const sansRang = duGroupe.filter(
        (a) => !classes.some((l) => l.athleteId === a.id),
      );
      return { cat, tableau, parId, classes, sansRang, restants };
    }),
  );

  return (
    <>
      <style>{`@page { size: A4 landscape; margin: 11mm; }`}</style>

      <FilAriane>Classement général complet</FilAriane>

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
        <BoutonImprimer nombre={feuilles.length} mot="feuille" />
        {categories.length < retenues.length ? (
          <Link
            href="/admin/impression/classement"
            style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}
          >
            Toutes les catégories
          </Link>
        ) : (
          retenues.map((c) => (
            <Link
              key={c.id}
              href={`/admin/impression/classement?categorie=${c.id}`}
              style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}
            >
              Seulement {c.nom}
            </Link>
          ))
        )}
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Tous les athlètes, du premier au dernier, avec les points de chaque
          épreuve. Une feuille par catégorie. Provisoire tant qu&apos;un passage
          reste à faire.
        </div>
      </div>

      {feuilles.map((f) => {
        const definitif = f.restants === 0;
        return (
          <article
            key={f.cat.id}
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
                  {comp.nom} · Classement général
                  {dateTexte ? ` · ${dateTexte}` : ""}
                  {comp.lieu ? ` · ${comp.lieu}` : ""}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>
                  Classement général
                  <span style={{ color: C.orange }}> · {f.cat.nom}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.encre3 }}>
                    {" "}
                    · {vue.length} épreuve{vue.length > 1 ? "s" : ""}
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
                {definitif ? "Classement définitif" : "Classement provisoire"}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0,
                    textTransform: "none",
                  }}
                >
                  {definitif
                    ? `${f.classes.length} classé${f.classes.length > 1 ? "s" : ""}`
                    : `${f.restants} passage${f.restants > 1 ? "s" : ""} encore à valider`}
                </div>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 36 }}>Rang</th>
                  <th style={{ ...th, width: 50 }}>Dossard</th>
                  <th style={th}>Athlète</th>
                  <th style={th}>Club · poids</th>
                  {vue.map((e, i) => (
                    <th
                      key={e.id}
                      title={e.nom}
                      style={{ ...th, textAlign: "right", maxWidth: 90 }}
                    >
                      <span style={{ color: C.encre4 }}>{i + 1}.</span> {e.nom}
                    </th>
                  ))}
                  <th style={{ ...th, width: 60, textAlign: "right" }}>Total</th>
                  <th style={{ ...th, width: 70, textAlign: "right" }}>
                    1res · 2es · 3es
                  </th>
                </tr>
              </thead>
              <tbody>
                {f.classes.map((l) => {
                  const a = f.parId.get(l.athleteId)!;
                  return (
                    <tr key={l.athleteId}>
                      <td style={{ ...td, fontWeight: 700, fontSize: 17, color: C.orange }}>
                        {l.rang}
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>{a.dossard ?? "—"}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{nomComplet(a)}</td>
                      <td style={{ ...td, fontSize: 11, color: C.encre3 }}>
                        {clubAffiche(a.club)}
                        {a.poidsCorps !== null ? ` · ${virgule(a.poidsCorps)} kg` : ""}
                      </td>
                      {vue.map((e) => {
                        const pts = f.tableau.parEpreuve.get(e.id)?.get(l.athleteId);
                        return (
                          <td key={e.id} style={{ ...td, textAlign: "right" }}>
                            {pts === undefined ? "—" : virgule(pts)}
                          </td>
                        );
                      })}
                      <td style={{ ...td, fontWeight: 700, fontSize: 15, textAlign: "right" }}>
                        {virgule(l.total)}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: C.encre3, textAlign: "right" }}>
                        {l.places.join(" · ")}
                      </td>
                    </tr>
                  );
                })}
                {f.classes.length === 0 ? (
                  <tr>
                    <td colSpan={6 + vue.length} style={{ ...td, color: C.encre4 }}>
                      Aucun athlète classé dans cette catégorie pour l&apos;instant.
                    </td>
                  </tr>
                ) : null}
                {f.sansRang.map((a) => (
                  <tr key={a.id}>
                    <td style={{ ...td, color: C.encre4 }}>—</td>
                    <td style={{ ...td, fontWeight: 700, color: C.encre3 }}>
                      {a.dossard ?? "—"}
                    </td>
                    <td style={{ ...td, color: C.encre3 }}>{nomComplet(a)}</td>
                    <td style={{ ...td, fontSize: 11, color: C.encre4 }}>
                      {clubAffiche(a.club)}
                    </td>
                    <td
                      colSpan={2 + vue.length}
                      style={{ ...td, fontSize: 12, fontStyle: "italic", color: C.encre3 }}
                    >
                      {a.horsClassement ? "Invité, hors classement" : "Non classé"}
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
                Points par épreuve, cumulés · ex æquo départagés aux places ·
                imprimé le {new Date().toLocaleDateString("fr-FR")}
              </span>
            </div>
          </article>
        );
      })}
    </>
  );
}
