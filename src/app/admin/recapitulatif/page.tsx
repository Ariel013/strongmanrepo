import Link from "next/link";
import { C } from "@/lib/charte";
import { FilAriane, TitreSection } from "@/components/chrome";
import { Encart, styleBouton } from "@/components/ui";
import {
  categoriesDe,
  competitionCourante,
  epreuvesDe,
  fichesAthletes,
  officielsDe,
  programmeDe,
} from "@/lib/donnees";

/**
 * Le récapitulatif de préparation — la vue « estRecap » du logiciel d'origine.
 *
 * Il ne bloque rien : une compétition peut être lancée avec des lignes
 * incomplètes. Il dit seulement ce qui manque, et chaque point mène à
 * l'étape qui le corrige. Un contrôle qui ne mène nulle part oblige à
 * chercher soi-même.
 */
export const dynamic = "force-dynamic";

export default async function PageRecapitulatif() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Récapitulatif</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuves, categories, officiels, athletes, prog] = await Promise.all([
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
    officielsDe(comp.id),
    fichesAthletes(comp.id),
    programmeDe(comp.id),
  ]);

  const nommes = officiels.filter((o) => o.nom.trim());
  const juges = nommes.filter((o) => o.role === "juge").length;
  const peses = athletes.filter((a) => a.peseeValidee).length;
  const complets = athletes.filter(
    (a) =>
      a.prenoms.trim() &&
      a.dossard !== null &&
      a.poidsCorps !== null &&
      (a.horsClassement || a.categorieId),
  ).length;
  const retenus = categories.filter((c) => c.active).length;

  const lignes = [
    {
      ok: epreuves.length >= 1,
      titre: "Épreuves",
      detail: `${epreuves.length} épreuve(s) définie(s)`,
      etape: 0,
    },
    {
      ok: retenus >= 1,
      titre: "Groupes de poids",
      detail: `${categories.length} groupe(s), dont ${retenus} retenu(s) au plateau`,
      etape: 1,
    },
    {
      ok: nommes.length >= 5,
      titre: "Officiels",
      detail: `${nommes.length} officiel(s) nommé(s), dont ${juges} juge(s) de terrain`,
      etape: 2,
    },
    {
      ok: athletes.length >= 2 && complets === athletes.length,
      titre: "Athlètes",
      detail: `${athletes.length} engagé(s), ${complets} fiche(s) complète(s)`,
      etape: 3,
    },
    {
      ok: athletes.length > 0 && peses === athletes.length,
      titre: "Pesée",
      detail: `${peses} / ${athletes.length} pesée(s) validée(s)`,
      etape: 4,
    },
    {
      ok: prog.length >= 3,
      titre: "Programme",
      detail: `${prog.length} ligne(s) au programme`,
      etape: 5,
    },
  ];

  const manques = lignes.filter((l) => !l.ok).length;

  return (
    <>
      <FilAriane>Récapitulatif</FilAriane>
      <TitreSection
        debut="Récapitulatif"
        suite="de préparation"
        chapeau="Ce qui est prêt, ce qui manque. Rien n'empêche de lancer la compétition avec des lignes incomplètes, mais chaque manque est signalé ici."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lignes.map((l) => {
          const couleur = l.ok ? C.vert : C.orange;
          return (
            <div
              key={l.titre}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                background: C.blanc,
                border: `1px solid ${C.bordure}`,
                borderLeft: `4px solid ${couleur}`,
                borderRadius: 12,
                padding: "15px 18px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: l.ok
                    ? "rgba(11,146,55,.12)"
                    : "rgba(236,109,35,.14)",
                  color: couleur,
                  fontSize: 14,
                  fontWeight: 700,
                  flex: "none",
                }}
                aria-hidden
              >
                {l.ok ? "✓" : "!"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{l.titre}</div>
                <div
                  style={{ fontSize: 14, color: C.encre3, lineHeight: 1.45 }}
                >
                  {l.detail}
                </div>
              </div>
              <Link
                href={`/admin/preparation?etape=${l.etape}`}
                title="Ouvre l'étape concernée pour compléter ce point"
                style={styleBouton("creme", {
                  flex: "none",
                  padding: "9px 14px",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 500,
                })}
              >
                Ouvrir
              </Link>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 26,
          padding: 20,
          borderRadius: 14,
          background: "linear-gradient(100deg,#EC6D23,#BC4F14)",
          color: C.blanc,
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>
          {manques === 0
            ? "Préparation complète"
            : manques === 1
              ? "Un point à compléter"
              : `${manques} points à compléter`}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
          {manques === 0
            ? "Tout est en place. La compétition pourra être lancée dès l'ouverture du plateau."
            : "Vous pouvez revenir plus tard : la saisie est enregistrée au fur et à mesure."}
        </div>
      </div>
    </>
  );
}
