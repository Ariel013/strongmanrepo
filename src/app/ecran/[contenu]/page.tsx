/**
 * Écrans publics du mur LED — `/ecran/plateau`, `/ecran/ordre`,
 * `/ecran/verdict`, `/ecran/classement`, `/ecran/podium`, `/ecran/attente`,
 * `/ecran/mire`.
 *
 * Portés à l'identique des écrans « solo » du logiciel d'origine : mêmes
 * compositions, mêmes tailles en `vh`/`vw`, mêmes couleurs jour et nuit. Un
 * mur LED n'a pas les proportions d'un écran de bureau, et une taille en
 * pixels y devient illisible ou débordante.
 *
 * Lecture seule, sans authentification, sans aucune donnée personnelle : tout
 * passe par `AthletePublic`, qui ne porte ni téléphone, ni contact d'urgence.
 *
 * Un écran vide et muet se lit comme une panne : chaque cas sans donnée dit
 * explicitement ce qu'il attend.
 */

import { notFound } from "next/navigation";
import { couleurCategorie, theme } from "@/lib/charte";
import {
  athletesDe,
  categoriesDe,
  competitionCourante,
  epreuvesCompletes,
  logosDe,
  niveauxPour,
  passagesDe,
  type EpreuveVue,
  type PassageVue,
} from "@/lib/donnees";
import { versMesure } from "@/lib/classement";
import { Cadre, Message } from "./commun";
import { VuePlateau } from "./vues/plateau";
import { VueResultats } from "./vues/resultats";
import { VueClubs } from "./vues/clubs";
import { VueOrdre } from "./vues/ordre";
import { VueVerdict } from "./vues/verdict";
import { VueClassement } from "./vues/classement";
import { VuePodium } from "./vues/podium";
import { VueAttente } from "./vues/attente";
import { Mire } from "./vues/mire";

/**
 * Le rendu serveur est refait au plus toutes les deux secondes. Le composant
 * client `Rafraichir` déclenche la demande ; cette valeur borne le coût côté
 * base. Le chronomètre et le compte à rebours, eux, tournent dans le
 * navigateur : ils ne peuvent pas attendre deux secondes.
 */
export const revalidate = 2;

const CONTENUS = [
  "plateau",
  "ordre",
  "verdict",
  "resultats",
  "classement",
  "podium",
  "clubs",
  "attente",
  "mire",
] as const;
type Contenu = (typeof CONTENUS)[number];

const estContenu = (v: string): v is Contenu =>
  (CONTENUS as readonly string[]).includes(v);

/* ── Page ─────────────────────────────────────────────────────────────── */

export default async function PageEcran({
  params,
  searchParams,
}: {
  params: Promise<{ contenu: string }>;
  searchParams: Promise<{ apercu?: string }>;
}) {
  const { contenu } = await params;
  if (!estContenu(contenu)) notFound();
  const { apercu } = await searchParams;

  const comp = await competitionCourante();
  if (!comp) {
    return (
      <Cadre t={theme("nuit")} apercu={!!apercu}>
        <Message
          t={theme("nuit")}
          texte="Aucune compétition"
          detail="Installez la compétition depuis l'administration."
        />
      </Cadre>
    );
  }

  const t = theme(comp.themeEcran === "jour" ? "jour" : "nuit");

  if (contenu === "mire") {
    return (
      <Cadre t={t} apercu={!!apercu}>
        <Mire t={t} />
      </Cadre>
    );
  }

  const [epreuvesCompl, categoriesToutes, athletes, logos] = await Promise.all([
    epreuvesCompletes(comp.id),
    categoriesDe(comp.id),
    athletesDe(comp.id),
    logosDe(comp.id),
  ]);
  const categories = categoriesToutes.filter((c) => c.active);

  const epreuves: EpreuveVue[] = epreuvesCompl.map((e) => ({
    id: e.id,
    nom: e.nom,
    mesure: versMesure(e.mesure),
    tempsLimiteS: e.tempsLimiteS,
    essais: e.essais,
    critere: e.critere,
    position: e.position,
  }));

  const epreuveCourante =
    epreuvesCompl.find((e) => e.id === comp.epreuveCouranteId) ??
    epreuvesCompl[0] ??
    null;
  const melange =
    comp.categorieCouranteId === null ||
    epreuveCourante?.passage === "melange";
  const enJeu = melange
    ? categories
    : categories.filter((c) => c.id === comp.categorieCouranteId);

  const couleurDe = (categorieId: string | null): string =>
    categoriesToutes.find((c) => c.id === categorieId)?.couleur ??
    couleurCategorie(-1);
  const nomCat = (categorieId: string | null): string =>
    categoriesToutes.find((c) => c.id === categorieId)?.nom ??
    "Sans catégorie";

  const concernes = athletes.filter((a) =>
    enJeu.some((c) => c.id === a.categorieId),
  );

  const [passages, niveaux] = epreuveCourante
    ? await Promise.all([
        passagesDe(
          epreuveCourante.id,
          concernes.map((a) => a.id),
        ),
        niveauxPour(comp.id, epreuveCourante.id),
      ])
    : [[] as PassageVue[], {} as Record<string, string>];

  const parId = new Map(athletes.map((a) => [a.id, a]));
  const commun = {
    t,
    parId,
    couleurDe,
    nomCat,
    logos,
    niveaux,
    aNiveau: !!epreuveCourante?.niveau,
    nomEpreuve: epreuveCourante?.nom ?? "—",
    nomGroupe: melange
      ? "Toutes catégories"
      : (enJeu[0]?.nom ?? "—"),
  };

  const avenir = passages
    .filter((p) => p.statut === "avenir")
    .sort((a, b) => a.ordre - b.ordre);
  const auPlateau = passages
    .filter((p) => p.statut === "plateau")
    .sort((a, b) => a.ordre - b.ordre);

  /* ── Compétition suspendue : elle prime sur tout le reste ── */
  if (comp.suspendue && contenu !== "attente") {
    return (
      <Cadre t={t} apercu={!!apercu}>
        <Message
          t={t}
          texte="Compétition suspendue"
          detail={comp.motifSuspension ?? "Reprise annoncée au micro"}
        />
      </Cadre>
    );
  }

  return (
    <Cadre t={t} apercu={!!apercu}>
      {contenu === "plateau" ? (
        <VuePlateau
          {...commun}
          comp={comp}
          auPlateau={auPlateau}
          avenir={avenir}
          melange={melange}
          categories={enJeu}
        />
      ) : null}

      {contenu === "ordre" ? (
        <VueOrdre
          {...commun}
          avenir={avenir}
          melange={melange}
          categories={enJeu}
        />
      ) : null}

      {contenu === "verdict" ? (
        <VueVerdict
          {...commun}
          passages={passages}
          mesure={epreuveCourante?.mesure ?? null}
        />
      ) : null}

      {contenu === "resultats" ? (
        <VueResultats
          {...commun}
          epreuve={epreuves.find((e) => e.id === epreuveCourante?.id) ?? null}
          categories={enJeu.length > 0 ? enJeu : categories}
          epreuves={epreuves}
          athletes={athletes}
          competitionId={comp.id}
          restants={passages.filter((p) => p.statut !== "termine").length}
        />
      ) : null}

      {contenu === "classement" ? (
        <VueClassement
          {...commun}
          categories={categories}
          epreuves={epreuves}
          athletes={athletes}
          competitionId={comp.id}
        />
      ) : null}

      {contenu === "podium" ? (
        <VuePodium
          {...commun}
          categories={enJeu.length > 0 ? enJeu : categories}
          epreuves={epreuves}
          athletes={athletes}
          competitionId={comp.id}
        />
      ) : null}

      {contenu === "clubs" ? (
        <VueClubs
          {...commun}
          categories={categories}
          epreuves={epreuves}
          athletes={athletes}
          competitionId={comp.id}
        />
      ) : null}

      {contenu === "attente" ? (
        <VueAttente t={t} comp={comp} athletes={athletes} />
      ) : null}
    </Cadre>
  );
}
