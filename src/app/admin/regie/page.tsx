import { C, couleurCategorie, uniteCourte, virgule } from "@/lib/charte";
import { FilAriane, TitreSection } from "@/components/chrome";
import { Encart } from "@/components/ui";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesDe,
  sortiesDe,
  tableauEpreuve,
  tousLesResultats,
} from "@/lib/donnees";
import { Regie } from "./regie";

/**
 * La régie de diffusion — la vue « estRegie » du logiciel d'origine.
 *
 * Une ligne par écran branché. La régie ne pilote pas les écrans à distance :
 * chaque écran ouvre son adresse et s'y tient. Ce qui est réglé ici survit au
 * redémarrage du poste, c'est tout — et c'est déjà ce qui manquait au poste
 * autonome le jour où il fallait rouvrir six fenêtres dans l'urgence.
 */
export const dynamic = "force-dynamic";

export default async function PageRegie() {
  const comp = await competitionCourante();
  if (!comp) {
    return (
      <>
        <FilAriane>Régie</FilAriane>
        <Encart ton="ambre">Aucune compétition installée.</Encart>
      </>
    );
  }

  const [epreuves, categoriesToutes, athletes, sorties] = await Promise.all([
    epreuvesDe(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
    sortiesDe(comp.id),
  ]);
  const categories = categoriesToutes.filter((c) => c.active);

  const epreuveCourante =
    epreuves.find((e) => e.id === comp.epreuveCouranteId) ?? epreuves[0];
  const resultats = await tousLesResultats(comp.id, epreuves);

  const parCategorie = epreuveCourante
    ? categories.map((cat) => {
        const rang = categoriesToutes.findIndex((c) => c.id === cat.id);
        const lignes = tableauEpreuve(
          epreuveCourante,
          cat.id,
          athletes,
          resultats,
        ).lignes.filter((l) => l.rang !== null);
        return {
          id: cat.id,
          nom: cat.nom,
          couleur: couleurCategorie(rang),
          lignes: lignes.map((l) => {
            const a = athletes.find((x) => x.id === l.athleteId);
            return {
              rang: l.rang!,
              nom: a ? `${a.nom.toUpperCase()} ${a.prenoms}`.trim() : "—",
              perf:
                l.resultat === null
                  ? "—"
                  : `${virgule(l.resultat.valeur)}${uniteCourte(epreuveCourante.mesure)}${
                      l.resultat.temps !== null
                        ? ` · ${virgule(l.resultat.temps)} s`
                        : ""
                    }`,
              points: l.points,
            };
          }),
        };
      })
    : [];

  return (
    <>
      <FilAriane>Régie de diffusion</FilAriane>
      <TitreSection
        debut="Régie"
        suite="de diffusion"
        chapeau="Une sortie par écran. Choisissez le contenu, ouvrez la fenêtre sur la sortie vidéo correspondante : elle se met à jour toute seule à chaque décision du plateau. Sombre par défaut pour l'extérieur, bouton jour/nuit ci-dessous."
      />

      <Regie
        competitionId={comp.id}
        theme={comp.themeEcran === "jour" ? "jour" : "nuit"}
        sorties={sorties.map((s) => ({
          id: s.id,
          nom: s.nom,
          contenu: s.contenu,
        }))}
        nomEpreuveCourante={epreuveCourante?.nom ?? "—"}
        parCategorie={parCategorie}
      />

      <div
        style={{
          marginTop: 22,
          padding: "14px 16px",
          borderRadius: 11,
          background: "rgba(11,146,55,.07)",
          border: "1px solid rgba(11,146,55,.18)",
          fontSize: 13,
          lineHeight: 1.5,
          color: C.vertFonce,
        }}
      >
        Montage retenu : les fenêtres écrans lisent la compétition sur le
        serveur et se rafraîchissent toutes seules. Elles n&apos;ont besoin
        d&apos;aucun code — n&apos;importe quel poste du réseau peut les
        afficher.
      </div>
    </>
  );
}
