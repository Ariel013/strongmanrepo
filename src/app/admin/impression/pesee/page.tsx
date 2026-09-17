import Link from "next/link";
import { C, clubAffiche, nomComplet, virgule } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  categoriesDe,
  competitionCourante,
  fichesAthletes,
  type FicheAthlete,
} from "@/lib/donnees";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * La feuille de pesée — une par catégorie, plus une pour les athlètes pas
 * encore rangés. L'officiel note le poids pesé et coche le groupe confirmé
 * sur le papier ; la table reporte ensuite à l'étape Pesée.
 *
 * Même règle que les autres feuilles : les colonnes portent les mots de
 * l'écran de ressaisie (« Poids pesé (kg) », « Pesée validée »).
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
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "9px 6px",
  borderBottom: `1px solid ${C.bordure2}`,
  fontSize: 14,
  verticalAlign: "middle",
};

function Case({ largeur, texte }: { largeur: number; texte?: string | null }) {
  return (
    <div
      style={{
        width: largeur,
        height: 36,
        border: `1.5px solid ${texte ? C.bordure2 : C.encre}`,
        borderRadius: 5,
        background: texte ? C.papier2 : C.blanc,
        color: C.encre3,
        fontSize: 14,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {texte ?? ""}
    </div>
  );
}

export default async function PagePesee() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Feuille de pesée</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }
  const [categories, athletes] = await Promise.all([
    categoriesDe(comp.id),
    fichesAthletes(comp.id),
  ]);
  const retenues = categories.filter((c) => c.active);
  const parNom = (a: FicheAthlete, b: FicheAthlete) =>
    (a.dossard ?? 9999) - (b.dossard ?? 9999) || a.nom.localeCompare(b.nom, "fr");

  const feuilles: { titre: string; couleur: string; bornes: string; lignes: FicheAthlete[] }[] = [
    ...retenues.map((c) => ({
      titre: c.nom,
      couleur: c.couleur,
      bornes:
        c.poidsMin === null && c.poidsMax === null
          ? "sans limite de poids"
          : c.poidsMin === null
            ? `jusqu'à ${virgule(c.poidsMax)} kg`
            : c.poidsMax === null
              ? `au-dessus de ${virgule(c.poidsMin)} kg`
              : `de ${virgule(c.poidsMin)} à ${virgule(c.poidsMax)} kg`,
      lignes: athletes.filter((a) => a.categorieId === c.id).sort(parNom),
    })),
  ];
  const aRanger = athletes
    .filter((a) => !a.categorieId && !a.horsClassement)
    .sort(parNom);
  if (aRanger.length > 0)
    feuilles.push({
      titre: "À ranger à la pesée",
      couleur: C.encre4,
      bornes: "athlètes sans catégorie : le poids pesé décide du groupe",
      lignes: aRanger,
    });
  const invites = athletes.filter((a) => a.horsClassement).sort(parNom);
  if (invites.length > 0)
    feuilles.push({
      titre: "Invités, hors classement",
      couleur: C.orange,
      bornes: "pesés pour le procès-verbal, jamais classés",
      lignes: invites,
    });

  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 12mm; }`}</style>
      <FilAriane>Feuille de pesée</FilAriane>
      <div className="ne-pas-imprimer" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
        <BoutonImprimer nombre={Math.max(1, feuilles.length)} mot="feuille" />
        <Link href="/admin/preparation?etape=4" style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}>
          ← Étape Pesée
        </Link>
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Une feuille par catégorie. L&apos;officiel note le poids pesé et
          signe ; la table reporte ensuite à l&apos;étape Pesée, qui valide
          et attribue le dossard.
        </div>
      </div>

      {feuilles.length === 0 ? (
        <Encart ton="ambre">Aucun athlète engagé : rien à peser.</Encart>
      ) : null}

      {feuilles.map((f) => (
        <article key={f.titre} className="fiche-papier" style={{ background: C.blanc, border: `1px solid ${C.bordure}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24, color: C.encre }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 8, borderBottom: `2px solid ${C.encre}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fibda.jpg" alt="FIBDA" style={{ width: 40, height: 40, objectFit: "contain", flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: C.encre3 }}>
                {comp.nom} · Feuille de pesée{dateTexte ? ` · ${dateTexte}` : ""}{comp.lieu ? ` · ${comp.lieu}` : ""}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: f.couleur, marginRight: 8, verticalAlign: "middle" }} />
                {f.titre}
                <span style={{ fontSize: 14, fontWeight: 500, color: C.encre3 }}> · {f.bornes}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.encre3, textAlign: "right", flex: "none" }}>
              {f.lignes.length} athlète{f.lignes.length > 1 ? "s" : ""}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 28 }}>#</th>
                <th style={{ ...th, width: 56 }}>Dossard</th>
                <th style={th}>Athlète</th>
                <th style={th}>Club</th>
                <th style={{ ...th, width: 90 }}>Poids déclaré</th>
                <th style={{ ...th, width: 110 }}>Poids pesé (kg)</th>
                <th style={{ ...th, width: 80 }}>Pesée validée</th>
                <th style={{ ...th, width: 120 }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {f.lignes.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ ...td, color: C.encre4, fontWeight: 700 }}>{i + 1}</td>
                  <td style={td}><Case largeur={48} texte={a.dossard !== null ? String(a.dossard) : null} /></td>
                  <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {nomComplet(a)}
                    {a.horsClassement ? <span style={{ fontSize: 9, color: C.orangeFonce, marginLeft: 6 }}>INVITÉ</span> : null}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: C.encre3 }}>{clubAffiche(a.club)}</td>
                  <td style={{ ...td, color: C.encre3 }}>
                    {a.poidsDeclare !== null ? `${virgule(a.poidsDeclare)} kg` : "—"}
                  </td>
                  <td style={td}>
                    <Case largeur={100} texte={a.peseeValidee && a.poidsCorps !== null ? virgule(a.poidsCorps) : null} />
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", width: 18, height: 18, border: `1.5px solid ${C.encre}`, borderRadius: 3, alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                      {a.peseeValidee ? "✕" : ""}
                    </span>
                  </td>
                  <td style={td} />
                </tr>
              ))}
              {f.lignes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...td, color: C.encre4 }}>Aucun athlète rattaché à cette catégorie.</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12, paddingTop: 8, borderTop: `2px solid ${C.encre}`, fontSize: 12, color: C.encre2 }}>
            <span>Officiel de pesée : ________________________</span>
            <span>Responsable technique : ________________________</span>
            <span style={{ marginLeft: "auto" }}>Reporté dans le logiciel le ________ par ____________</span>
          </div>
        </article>
      ))}
    </>
  );
}
