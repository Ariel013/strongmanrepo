import { C, POINTS_CLUB_LISIBLE } from "@/lib/charte";
import { versMesure } from "@/lib/classement";
import { FilAriane, TitreSection } from "@/components/chrome";
import { Encart } from "@/components/ui";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  logosDe,
  tableauClubs,
  tousLesResultats,
  type EpreuveVue,
} from "@/lib/donnees";
import { BoutonImprimer } from "../impression/fiches/imprimer";

/**
 * Le classement des meilleurs clubs — recalculé depuis les rangs finaux de
 * chaque catégorie retenue, jamais stocké. Imprimable tel quel.
 */
export const dynamic = "force-dynamic";

export default async function PageClubs() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Classement des clubs</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuvesCompl, categories, athletes, logos] = await Promise.all([
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
    logosDe(comp.id),
  ]);
  const epreuves: EpreuveVue[] = epreuvesCompl.map((e) => ({
    id: e.id,
    nom: e.nom,
    mesure: versMesure(e.mesure),
    tempsLimiteS: e.tempsLimiteS,
    essais: e.essais,
    critere: e.critere,
    position: e.position,
  }));
  const resultats = await tousLesResultats(comp.id, epreuves);
  const lignes = tableauClubs(categories, epreuves, athletes, resultats);
  const sansClub = athletes.filter(
    (a) => !a.horsClassement && a.categorieId && !(a.club ?? "").trim(),
  ).length;

  return (
    <>
      <FilAriane>Classement des clubs</FilAriane>
      <div className="ne-pas-imprimer">
        <TitreSection
          debut="Classement"
          suite="des clubs"
          chapeau={`Le rang final de chaque athlète dans sa catégorie rapporte des points à son club : ${POINTS_CLUB_LISIBLE}. Recalculé à chaque validation, toutes catégories retenues confondues.`}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <BoutonImprimer nombre={1} />
          {sansClub > 0 ? (
            <span style={{ fontSize: 13, color: C.ambreEncre, fontWeight: 600 }}>
              {sansClub} athlète{sansClub > 1 ? "s" : ""} sans club : {sansClub > 1 ? "ils ne rapportent" : "il ne rapporte"} de points à personne.
            </span>
          ) : null}
        </div>
      </div>

      <article
        className="fiche-papier"
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 12,
          padding: "16px 20px",
          color: C.encre,
        }}
      >
        <div style={{ paddingBottom: 8, borderBottom: `2px solid ${C.encre}` }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: C.encre3 }}>
            Championnat National de Strongman 2026 · Classement des clubs
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Meilleurs clubs</div>
          <div style={{ fontSize: 12, color: C.encre3 }}>{POINTS_CLUB_LISIBLE}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr>
              {["Rang", "Club", "Athlètes classés", "Titres", "Points"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: C.encre2,
                    textAlign: i >= 2 ? "right" : "left",
                    padding: "8px 6px",
                    borderBottom: `2px solid ${C.encre}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => {
              const logo = logos.get(l.club);
              const td = { padding: "9px 6px", borderBottom: `1px solid ${C.bordure2}`, fontSize: 14 };
              return (
                <tr key={l.club}>
                  <td style={{ ...td, fontWeight: 700, fontSize: 18, color: C.orange, width: 50 }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                      ) : null}
                      {l.club}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right", color: C.encre3 }}>{l.athletes}</td>
                  <td style={{ ...td, textAlign: "right", color: C.encre3 }}>
                    {l.places[0]} / {l.places[1]} / {l.places[2]}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, fontSize: 16 }}>{l.points}</td>
                </tr>
              );
            })}
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "12px 6px", color: C.encre4, fontSize: 14 }}>
                  Aucun résultat validé : le classement des clubs se remplit au fil des épreuves.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 11, color: C.encre4 }}>
          Titres : nombre de premières / deuxièmes / troisièmes places, toutes catégories.
        </div>
      </article>
    </>
  );
}
