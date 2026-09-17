/**
 * Le palmarès : qui a gagné quoi, calculé depuis les classements — jamais
 * saisi. Sert à l'étape Récompenses (afficher les lauréats à côté de chaque
 * place) et à la feuille de palmarès imprimée.
 */

import { versMesure } from "./classement";
import {
  athletesDe,
  categoriesDe,
  epreuvesCompletes,
  tableauClubs,
  tableauGeneral,
  tousLesResultats,
  type EpreuveVue,
} from "./donnees";
import type { LigneClub } from "./classement";

export interface Laureat {
  rang: number;
  nom: string;
  prenoms: string;
  club: string | null;
  dossard: number | null;
  total: number;
}

export interface PalmaresCategorie {
  id: string;
  nom: string;
  couleur: string;
  laureats: Laureat[];
  /** Passages restants : le palmarès est provisoire tant qu'il y en a. */
  classes: number;
}

export interface Palmares {
  categories: PalmaresCategorie[];
  clubs: LigneClub[];
  /** Le classement compte au moins un résultat validé. */
  commence: boolean;
}

export async function palmares(competitionId: string): Promise<Palmares> {
  const [epreuvesCompl, categories, athletes] = await Promise.all([
    epreuvesCompletes(competitionId),
    categoriesDe(competitionId),
    athletesDe(competitionId),
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
  const resultats = await tousLesResultats(competitionId, epreuves);
  const parId = new Map(athletes.map((a) => [a.id, a]));
  let commence = false;
  for (const m of resultats.values()) if (m.size > 0) commence = true;

  const cats = categories
    .filter((c) => c.active)
    .map((c) => {
      const lignes = tableauGeneral(c, epreuves, athletes, resultats).lignes;
      return {
        id: c.id,
        nom: c.nom,
        couleur: c.couleur,
        classes: lignes.length,
        laureats: lignes
          .map((l) => {
            const a = parId.get(l.athleteId);
            return a
              ? {
                  rang: l.rang,
                  nom: a.nom,
                  prenoms: a.prenoms,
                  club: a.club,
                  dossard: a.dossard,
                  total: l.total,
                }
              : null;
          })
          .filter((l): l is Laureat => l !== null),
      };
    });

  return {
    categories: cats,
    clubs: tableauClubs(categories, epreuves, athletes, resultats),
    commence,
  };
}
