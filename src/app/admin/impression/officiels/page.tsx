import Link from "next/link";
import { C, libelleRole } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import { categoriesDe, competitionCourante, officielsDe } from "@/lib/donnees";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * La liste des officiels, à signer — le corps arbitral tel qu'il figure au
 * procès-verbal. Les postes communs d'abord, puis le staff de chaque
 * catégorie retenue.
 */
export const dynamic = "force-dynamic";

const th: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: C.encre2,
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: `2px solid ${C.encre}`,
};
const td: React.CSSProperties = {
  padding: "10px 6px",
  borderBottom: `1px solid ${C.bordure2}`,
  fontSize: 14,
  verticalAlign: "middle",
};

export default async function PageOfficiels() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Liste des officiels</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }
  const [officiels, categories] = await Promise.all([
    officielsDe(comp.id),
    categoriesDe(comp.id),
  ]);
  const nommes = officiels.filter((o) => o.nom.trim());
  const groupes: { titre: string; couleur: string | null; lignes: typeof nommes }[] = [
    {
      titre: "Postes communs à toutes les catégories",
      couleur: null,
      lignes: nommes.filter((o) => o.categorieId === null),
    },
    ...categories
      .filter((c) => c.active)
      .map((c) => ({
        titre: `Staff arbitral · ${c.nom}`,
        couleur: c.couleur,
        lignes: nommes.filter((o) => o.categorieId === c.id),
      })),
  ];
  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>
      <FilAriane>Liste des officiels</FilAriane>
      <div className="ne-pas-imprimer" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
        <BoutonImprimer nombre={1} />
        <Link href="/admin/preparation?etape=2" style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}>
          ← Modifier les officiels
        </Link>
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Le corps arbitral tel qu&apos;il figure au procès-verbal, avec une
          colonne de signature. Les postes communs, puis le staff de chaque catégorie.
        </div>
      </div>

      <article className="fiche-papier" style={{ background: C.blanc, border: `1px solid ${C.bordure}`, borderRadius: 12, padding: "20px 24px", color: C.encre }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 10, borderBottom: `2px solid ${C.encre}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fibda.jpg" alt="FIBDA" style={{ width: 44, height: 44, objectFit: "contain", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: C.encre3 }}>
              {comp.nom}{dateTexte ? ` · ${dateTexte}` : ""}{comp.lieu ? ` · ${comp.lieu}` : ""}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Officiels et corps arbitral</div>
          </div>
          <div style={{ fontSize: 12, color: C.encre3, flex: "none" }}>
            {nommes.length} officiel{nommes.length > 1 ? "s" : ""}
          </div>
        </div>

        {nommes.length === 0 ? (
          <div style={{ marginTop: 14, fontSize: 13, color: C.encre4 }}>
            Aucun officiel nommé. Renseignez-les à l&apos;étape Officiels.
          </div>
        ) : null}

        {groupes.map((g) => (
          <div key={g.titre} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.encre2, marginBottom: 4 }}>
              {g.couleur ? <span style={{ width: 12, height: 12, borderRadius: 3, background: g.couleur }} /> : null}
              {g.titre}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 30 }}>#</th>
                  <th style={th}>Nom, prénoms</th>
                  <th style={th}>Rôle</th>
                  <th style={{ ...th, width: 180 }}>Signature</th>
                </tr>
              </thead>
              <tbody>
                {g.lignes.map((o, i) => (
                  <tr key={o.id}>
                    <td style={{ ...td, color: C.encre4 }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{o.nom}</td>
                    <td style={td}>{libelleRole(o.role)}</td>
                    <td style={td} />
                  </tr>
                ))}
                {g.lignes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...td, color: C.encre4, fontStyle: "italic" }}>
                      {g.couleur ? "Aucun officiel affecté à cette catégorie." : "Aucun poste commun."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20, paddingTop: 8, borderTop: `2px solid ${C.encre}`, fontSize: 12, color: C.encre2 }}>
          <span>Directeur de compétition : ________________________</span>
          <span>Responsable arbitrage : ________________________</span>
          <span style={{ marginLeft: "auto", color: C.encre4 }}>Imprimé le {new Date().toLocaleDateString("fr-FR")}</span>
        </div>
      </article>
    </>
  );
}
