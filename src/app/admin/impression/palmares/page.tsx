import Link from "next/link";
import { C, METAUX, POINTS_CLUB_LISIBLE, clubAffiche, couleurMetal, nomComplet } from "@/lib/charte";
import { FilAriane } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import { competitionCourante, recompensesDe } from "@/lib/donnees";
import { recompensesPour } from "@/lib/classement";
import { palmares } from "@/lib/palmares";
import { BoutonImprimer } from "../fiches/imprimer";

/**
 * Le palmarès — qui reçoit quoi. Une page A4 : par catégorie, chaque place
 * dotée avec son lauréat, puis le meilleur club et sa récompense. Recalculé
 * depuis les classements, jamais recopié.
 */
export const dynamic = "force-dynamic";

const libRang = (i: number): string => (i === 0 ? "1ère place" : `${i + 1}e place`);

export default async function PagePalmares() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Palmarès</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }
  const [recompenses, pal] = await Promise.all([
    recompensesDe(comp.id),
    palmares(comp.id),
  ]);
  const meilleurClub = pal.clubs[0] ?? null;
  const dateTexte = comp.debutLe
    ? comp.debutLe.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const td: React.CSSProperties = { padding: "9px 6px", borderBottom: `1px solid ${C.bordure2}`, fontSize: 14, verticalAlign: "middle" };

  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>
      <FilAriane>Palmarès</FilAriane>
      <div className="ne-pas-imprimer" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
        <BoutonImprimer nombre={1} mot="feuille" />
        <Link href="/admin/preparation?etape=6" style={styleBouton("blanc", { padding: "10px 16px", borderRadius: 9 })}>
          ← Modifier les récompenses
        </Link>
        <div style={{ fontSize: 13, color: C.encre4, lineHeight: 1.5 }}>
          Les lauréats de chaque place dotée, par catégorie, puis le meilleur
          club. Provisoire tant que toutes les épreuves ne sont pas validées.
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>Palmarès</div>
          </div>
          {!pal.commence ? (
            <div style={{ fontSize: 11, fontWeight: 700, color: C.orangeFonce, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Aucun résultat validé
            </div>
          ) : null}
        </div>

        {pal.categories.map((cat) => {
          const { lignes: dotations, propres } = recompensesPour(recompenses, cat.id);
          return (
          <div key={cat.id} style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, paddingBottom: 4, borderBottom: `1px solid ${C.encre}`, marginBottom: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: cat.couleur }} />
              {cat.nom}
              <span style={{ fontSize: 12, fontWeight: 500, color: C.encre3 }}>
                · {cat.classes} classé{cat.classes > 1 ? "s" : ""}
                {propres ? "" : " · dotation commune"}
              </span>
            </div>
            {dotations.length === 0 ? (
              <div style={{ fontSize: 13, color: C.encre4, padding: "6px 0" }}>
                Aucune place dotée pour cette catégorie : renseignez-la à l&apos;étape Récompenses.
              </div>
            ) : null}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {dotations.map((r, i) => {
                  const l = cat.laureats.find((x) => x.rang === i + 1);
                  const couleur = couleurMetal(i);
                  return (
                    <tr key={r.id}>
                      <td style={{ ...td, width: 90, fontWeight: 700, color: couleur, whiteSpace: "nowrap" }}>{libRang(i)}</td>
                      <td style={{ ...td, width: 46, fontWeight: 700 }}>{l?.dossard ?? "—"}</td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {l ? nomComplet(l) : <span style={{ color: C.encre4, fontStyle: "italic" }}>{pal.commence ? "personne à ce rang" : "à déterminer"}</span>}
                        {l ? <div style={{ fontSize: 12, fontWeight: 400, color: C.encre3 }}>{clubAffiche(l.club)} · {l.total} pts</div> : null}
                      </td>
                      <td style={{ ...td, fontSize: 13 }}>
                        <strong>{r.titre || METAUX[i] || ""}</strong>
                        {r.prime ? <span style={{ color: C.vertFonce, fontWeight: 700 }}> · {r.prime}</span> : null}
                        {r.lot ? <div style={{ fontSize: 12, color: C.encre3 }}>{r.lot}</div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          );
        })}
        {pal.categories.length === 0 ? (
          <div style={{ marginTop: 14, fontSize: 13, color: C.encre4 }}>Aucune catégorie retenue.</div>
        ) : null}

        {/* Meilleur club */}
        <div style={{ marginTop: 22, padding: "12px 14px", border: `2px solid ${C.orange}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.orangeFonce }}>
            Meilleur club
          </div>
          {meilleurClub ? (
            <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap", marginTop: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{meilleurClub.club}</div>
              <div style={{ fontSize: 13, color: C.encre3 }}>
                {meilleurClub.points} pts · {meilleurClub.athletes} athlète{meilleurClub.athletes > 1 ? "s" : ""} classé{meilleurClub.athletes > 1 ? "s" : ""}
                {meilleurClub.places[0] > 0 ? ` · ${meilleurClub.places[0]} titre${meilleurClub.places[0] > 1 ? "s" : ""}` : ""}
              </div>
              {comp.recompenseClub ? (
                <div style={{ fontSize: 15, fontWeight: 700, color: C.vertFonce, marginLeft: "auto" }}>{comp.recompenseClub}</div>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.encre4, marginTop: 4 }}>
              Aucun résultat validé : le meilleur club se lira au fil des épreuves.
              {comp.recompenseClub ? ` Récompense prévue : ${comp.recompenseClub}.` : ""}
            </div>
          )}
          {pal.clubs.length > 1 ? (
            <div style={{ marginTop: 6, fontSize: 12, color: C.encre3 }}>
              Suivants : {pal.clubs.slice(1, 4).map((c) => `${c.club} (${c.points})`).join(", ")}. Barème : {POINTS_CLUB_LISIBLE}.
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20, paddingTop: 8, borderTop: `2px solid ${C.encre}`, fontSize: 12, color: C.encre2 }}>
          <span>Directeur de compétition : ________________________</span>
          <span>Juge principal : ________________________</span>
          <span style={{ marginLeft: "auto", color: C.encre4 }}>Imprimé le {new Date().toLocaleDateString("fr-FR")}</span>
        </div>
      </article>
    </>
  );
}
