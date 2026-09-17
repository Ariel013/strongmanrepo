import Link from "next/link";
import { C, libelleRole, tempsImpartiLisible } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  officielsDe,
  programmeDe,
} from "@/lib/donnees";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * Le programme de la journée, à imprimer — pour le speaker, l'accueil, les
 * clubs. Le déroulé saisi à l'étape Programme, puis les épreuves dans l'ordre
 * du programme, les catégories retenues et le corps arbitral.
 */
export const dynamic = "force-dynamic";

export default async function PageProgramme() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Programme de la journée</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [programme, epreuves, categories, officiels] = await Promise.all([
    programmeDe(comp.id),
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    officielsDe(comp.id),
  ]);
  const retenues = categories.filter((c) => c.active);
  const nommes = officiels.filter((o) => o.nom.trim());

  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const titre: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: C.encre3,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: `1px solid ${C.encre}`,
  };

  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>
      <FilAriane>Programme de la journée</FilAriane>

      <div
        className="ne-pas-imprimer"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}
      >
        <BoutonImprimer nombre={1} />
        <Link
          href="/admin/preparation?etape=5"
          style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}
        >
          ← Modifier le programme
        </Link>
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Une page A4 : le déroulé, les épreuves dans l&apos;ordre, les
          catégories et le corps arbitral. Pour le speaker, l&apos;accueil et
          les clubs.
        </div>
      </div>

      <article
        className="fiche-papier"
        style={{
          background: C.blanc,
          border: `1px solid ${C.bordure}`,
          borderRadius: 12,
          padding: "20px 24px",
          color: C.encre,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 10, borderBottom: `2px solid ${C.encre}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fibda.jpg" alt="FIBDA" style={{ width: 48, height: 48, objectFit: "contain", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: C.encre3 }}>
              Fédération Ivoirienne de Bodybuilding, Dynamophilie et Assimilés
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{comp.nom}</div>
            <div style={{ fontSize: 13, color: C.encre2, marginTop: 2 }}>
              {[dateTexte, comp.lieu, comp.adresse].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.orange, flex: "none" }}>
            Programme
          </div>
        </div>

        {/* Le déroulé */}
        <div style={titre}>Déroulé de la journée</div>
        {programme.length === 0 ? (
          <div style={{ fontSize: 13, color: C.encre4 }}>
            Aucun moment déclaré. Renseignez le programme à l&apos;étape Programme.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {programme.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 80, padding: "7px 8px 7px 0", fontSize: 16, fontWeight: 700, verticalAlign: "top", borderBottom: `1px solid ${C.bordure2}`, whiteSpace: "nowrap" }}>
                    {p.heure || "—"}
                  </td>
                  <td style={{ padding: "7px 0", fontSize: 15, verticalAlign: "top", borderBottom: `1px solid ${C.bordure2}`, lineHeight: 1.4 }}>
                    {p.texte || <span style={{ color: C.encre4 }}>(sans intitulé)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Les épreuves */}
        <div style={titre}>Épreuves, dans l&apos;ordre</div>
        {epreuves.length === 0 ? (
          <div style={{ fontSize: 13, color: C.encre4 }}>Aucune épreuve définie.</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14, lineHeight: 1.5 }}>
            {epreuves.map((e) => (
              <li key={e.id} style={{ marginBottom: 4 }}>
                <strong>{e.nom}</strong> · {tempsImpartiLisible(e.tempsLimiteS)}
                {e.critere ? <span style={{ color: C.encre3 }}> — {e.critere}</span> : null}
                {e.materiel ? (
                  <div style={{ fontSize: 12, color: C.encre4 }}>Matériel : {e.materiel}</div>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        {/* Catégories et corps arbitral, côte à côte */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          <div>
            <div style={titre}>Catégories</div>
            {retenues.length === 0 ? (
              <div style={{ fontSize: 13, color: C.encre4 }}>Aucune catégorie retenue.</div>
            ) : (
              retenues.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "3px 0" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: c.couleur, flex: "none" }} />
                  {c.nom}
                </div>
              ))
            )}
          </div>
          <div>
            <div style={titre}>Officiels</div>
            {nommes.length === 0 ? (
              <div style={{ fontSize: 13, color: C.encre4 }}>Aucun officiel nommé.</div>
            ) : (
              nommes.map((o) => (
                <div key={o.id} style={{ fontSize: 13, padding: "2px 0", lineHeight: 1.4 }}>
                  <strong>{o.nom}</strong>
                  <span style={{ color: C.encre3 }}> — {libelleRole(o.role)}</span>
                  {o.categorieId ? (
                    <span style={{ color: C.encre4 }}>
                      {" "}· {categories.find((c) => c.id === o.categorieId)?.nom ?? ""}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 8, borderTop: `2px solid ${C.encre}`, fontSize: 11, color: C.encre4, display: "flex", justifyContent: "space-between" }}>
          <span>Horaires donnés à titre indicatif : le déroulé réel suit les décisions du directeur de compétition.</span>
          <span>Imprimé le {new Date().toLocaleDateString("fr-FR")}</span>
        </div>
      </article>
    </>
  );
}
