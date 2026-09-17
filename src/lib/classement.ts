/**
 * Barème et classements — cœur métier de la compétition.
 *
 * Ce module est volontairement PUR : aucune dépendance, aucun accès base,
 * aucun React. Il prend des données en entrée et rend des tableaux. C'est ce
 * qui le rend testable et c'est ce qui permet de le recalculer à la demande.
 *
 * Règle de fond : les points ne sont JAMAIS stockés. Ils se dérivent de l'état
 * courant des athlètes et des résultats. Retirer un athlète d'une catégorie
 * change le nombre de classables, donc change rétroactivement les points de
 * tous les autres — une valeur figée en base serait fausse dès la première
 * disqualification.
 */

/** Les cinq façons de mesurer une performance. */
export type Mesure =
  | "nb_temps" // quantité, départagée par le temps intermédiaire
  | "poids" // charge maximale en kg
  | "duree" // temps de maintien, le plus long gagne
  | "distance" // distance parcourue, départagée par le temps
  | "chrono" // temps sur distance, le plus court gagne
  | "medley"; // parcours à ateliers : distance parcourue, départagée par le temps

/**
 * Seule `chrono` se classe à l'envers : la plus petite valeur gagne.
 *
 * `medley` figure bien dans ce type. Il en était absent alors que la mesure
 * est proposée partout ailleurs — les pages la faisaient passer par un
 * `as Mesure` qui faisait taire le compilateur. Le comportement était juste
 * par accident : rien ne garantissait qu'il le reste.
 */
export function plusPetitGagne(mesure: Mesure): boolean {
  return mesure === "chrono";
}

/** Les mesures reconnues, dans l'ordre du menu de l'étape Épreuves. */
export const MESURES_CONNUES: readonly Mesure[] = [
  "nb_temps",
  "poids",
  "duree",
  "distance",
  "chrono",
  "medley",
];

/**
 * Lit la mesure d'une épreuve venue de la base.
 *
 * La colonne est du texte : un `as Mesure` y fait passer n'importe quoi. Une
 * valeur inattendue — saisie à la main en base, ou restée d'une version
 * précédente — donnerait alors un classement silencieusement faux, puisque
 * `plusPetitGagne` la traiterait comme « le plus grand gagne ».
 *
 * On retombe donc sur `nb_temps`, la mesure la plus courante, ET on le signale
 * dans les journaux du serveur : un classement douteux doit laisser une trace.
 */
export function versMesure(valeur: string): Mesure {
  if ((MESURES_CONNUES as readonly string[]).includes(valeur))
    return valeur as Mesure;
  console.warn(
    `[classement] mesure inconnue « ${valeur} » : traitée comme « nb_temps ». ` +
      "Corrigez l'épreuve à l'étape Épreuves.",
  );
  return "nb_temps";
}

export type StatutResultat = "ok" | "zero" | "forfait";

export interface Resultat {
  statut: StatutResultat;
  /** Performance mesurée. `null` dès que le statut n'est pas « ok ». */
  valeur: number | null;
  /** Temps intermédiaire de départage, en secondes. `null` si non relevé. */
  temps: number | null;
}

export interface AthleteClassable {
  id: string;
  /** Poids de corps en kg — dernier critère de départage d'une épreuve. */
  poidsCorps: number | null;
  /** Numéro de dossard — ordre de passage de la première épreuve. */
  dossard: number | null;
  /**
   * Un athlète hors classement occupe le plateau mais ne prend ni rang ni
   * point, et ne compte pas dans l'effectif qui fixe la valeur des points.
   */
  horsClassement: boolean;
}

export interface LigneEpreuve {
  athleteId: string;
  /** `null` pour un athlète sans résultat exploitable (pas passé, zéro, forfait). */
  rang: number | null;
  points: number;
  resultat: Resultat | null;
}

export interface LigneGenerale {
  athleteId: string;
  rang: number;
  total: number;
  /** Nombre de premières, deuxièmes et troisièmes places — sert au départage. */
  places: [number, number, number];
}

/* ── Classement des clubs ────────────────────────────────────────────── */

/**
 * Barème des clubs, sur le rang final de chaque athlète dans sa catégorie :
 * 15, 10, 5, 4, 3 points pour les cinq premiers, 1 point pour tout autre
 * athlète classé. Un athlète sans club n'apporte rien à personne.
 */
export const POINTS_CLUB = [15, 10, 5, 4, 3] as const;
export const pointsClub = (rang: number): number =>
  POINTS_CLUB[rang - 1] ?? 1;

export interface LigneClub {
  club: string;
  points: number;
  /** Athlètes classés qui ont marqué pour le club. */
  athletes: number;
  /** Premières, deuxièmes, troisièmes places — sert au départage. */
  places: [number, number, number];
}

/**
 * Cumule les rangs finaux de toutes les catégories par club.
 *
 * Départage : les points, puis le nombre de premières, deuxièmes et
 * troisièmes places, puis le nom du club — pour que deux clubs à égalité
 * parfaite sortent toujours dans le même ordre.
 */
export function classementClubs(
  entrees: { club: string | null; rang: number }[],
): LigneClub[] {
  const parClub = new Map<string, LigneClub>();
  for (const e of entrees) {
    const club = (e.club ?? "").trim();
    if (!club || e.rang < 1) continue;
    const l = parClub.get(club) ?? {
      club,
      points: 0,
      athletes: 0,
      places: [0, 0, 0] as [number, number, number],
    };
    l.points += pointsClub(e.rang);
    l.athletes += 1;
    if (e.rang <= 3) l.places[e.rang - 1] += 1;
    parClub.set(club, l);
  }
  return [...parClub.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.places[0] - a.places[0] ||
      b.places[1] - a.places[1] ||
      b.places[2] - a.places[2] ||
      a.club.localeCompare(b.club, "fr"),
  );
}

/** Une valeur absente ne doit jamais gagner un départage : elle part à l'infini. */
const ouInfini = (v: number | null | undefined): number =>
  v === null || v === undefined || Number.isNaN(v) ? Infinity : v;

/**
 * Le meilleur des essais d'un athlète sur une épreuve.
 *
 * Trie selon le même critère que l'épreuve elle-même — valeur, puis temps —
 * et rend le premier. Les résultats « zero » et « forfait » ne sont pas des
 * performances : ils sont écartés en amont par l'appelant.
 */
export function meilleurResultat(
  resultats: Resultat[],
  mesure: Mesure,
): Resultat | null {
  const exploitables = resultats.filter(
    (r) => r.statut === "ok" && r.valeur !== null,
  );
  if (exploitables.length === 0) return null;
  const asc = plusPetitGagne(mesure);
  return [...exploitables].sort((a, b) => {
    const av = a.valeur as number;
    const bv = b.valeur as number;
    if (av !== bv) return asc ? av - bv : bv - av;
    return ouInfini(a.temps) - ouInfini(b.temps);
  })[0];
}

/**
 * Classement d'une épreuve pour une catégorie.
 *
 * Points = N − rang + 1, où N est l'effectif CLASSABLE de la catégorie —
 * qu'il ait concouru ou non. Le premier d'une catégorie de 10 marque 10
 * points ; dans une catégorie de 6, il en marque 6. C'est voulu : le barème
 * récompense la position dans son effectif.
 *
 * Départage, dans l'ordre : la performance, puis le temps intermédiaire le
 * plus court, puis le poids de corps le plus léger. Deux athlètes ne sont ex
 * æquo que si ces trois valeurs coïncident.
 */
export function classementEpreuve(
  athletes: AthleteClassable[],
  mesure: Mesure,
  /** Meilleur résultat retenu par athlète. Absent = n'a pas de performance. */
  resultatsParAthlete: Map<string, Resultat | null>,
): LigneEpreuve[] {
  const classables = athletes.filter((a) => !a.horsClassement);
  const effectif = classables.length;

  const avec: { a: AthleteClassable; r: Resultat }[] = [];
  const sans: AthleteClassable[] = [];
  for (const a of classables) {
    const r = resultatsParAthlete.get(a.id) ?? null;
    if (r && r.statut === "ok" && r.valeur !== null) avec.push({ a, r });
    else sans.push(a);
  }

  const asc = plusPetitGagne(mesure);
  avec.sort((x, y) => {
    const xv = x.r.valeur as number;
    const yv = y.r.valeur as number;
    if (xv !== yv) return asc ? xv - yv : yv - xv;
    const xt = ouInfini(x.r.temps);
    const yt = ouInfini(y.r.temps);
    if (xt !== yt) return xt - yt;
    return ouInfini(x.a.poidsCorps) - ouInfini(y.a.poidsCorps);
  });

  const lignes: LigneEpreuve[] = [];
  let rang = 0;
  let position = 0;
  let clePrecedente: string | null = null;
  for (const { a, r } of avec) {
    position++;
    const cle = `${r.valeur}|${ouInfini(r.temps)}|${ouInfini(a.poidsCorps)}`;
    // Ex æquo : même rang, mais la position continue d'avancer — deux premiers
    // sont suivis d'un troisième, jamais d'un second.
    if (cle !== clePrecedente) {
      rang = position;
      clePrecedente = cle;
    }
    lignes.push({
      athleteId: a.id,
      rang,
      points: Math.max(0, effectif - rang + 1),
      resultat: r,
    });
  }

  // Pas de performance : présent au tableau, sans rang ni point. Les afficher
  // importe — un athlète absent de l'écran se lit comme une donnée perdue.
  for (const a of sans) {
    lignes.push({ athleteId: a.id, rang: null, points: 0, resultat: null });
  }
  return lignes;
}

/**
 * Classement général d'une catégorie, toutes épreuves cumulées.
 *
 * Départage : le total, puis le nombre de premières places, puis de
 * deuxièmes, puis de troisièmes. Au-delà, l'ordre des dossards tranche — le
 * tri est stable et `athletes` arrive trié par dossard.
 */
export function classementGeneral(
  athletes: AthleteClassable[],
  /** Une entrée par épreuve, dans l'ordre du programme. */
  tableauxParEpreuve: LigneEpreuve[][],
): LigneGenerale[] {
  const classables = athletes.filter((a) => !a.horsClassement);
  const parAthlete = tableauxParEpreuve.map(
    (t) => new Map(t.map((l) => [l.athleteId, l])),
  );

  const lignes = classables.map((a) => {
    let total = 0;
    const places: [number, number, number] = [0, 0, 0];
    for (const m of parAthlete) {
      const l = m.get(a.id);
      if (!l) continue;
      total += l.points;
      if (l.rang !== null && l.rang >= 1 && l.rang <= 3) places[l.rang - 1]++;
    }
    return { a, total, places };
  });

  lignes.sort((x, y) => {
    if (x.total !== y.total) return y.total - x.total;
    for (let i = 0; i < 3; i++) {
      if (x.places[i] !== y.places[i]) return y.places[i] - x.places[i];
    }
    return 0; // tri stable : l'ordre des dossards subsiste
  });

  const sortie: LigneGenerale[] = [];
  let rang = 0;
  let position = 0;
  let clePrecedente: string | null = null;
  for (const l of lignes) {
    position++;
    const cle = `${l.total}|${l.places.join(",")}`;
    if (cle !== clePrecedente) {
      rang = position;
      clePrecedente = cle;
    }
    sortie.push({
      athleteId: l.a.id,
      rang,
      total: l.total,
      places: l.places,
    });
  }
  return sortie;
}

/**
 * Ordre de passage d'une épreuve.
 *
 * Première épreuve du programme : les dossards croissants. Ensuite, le moins
 * de points passe en premier — le leader ferme la marche, et le public voit
 * la tension monter jusqu'au dernier passage. À égalité de points, le dossard
 * tranche.
 */
export function ordreDePassage(
  athletes: AthleteClassable[],
  /** Rang de l'épreuve dans le programme, à partir de 0. */
  indexEpreuve: number,
  /** Points cumulés sur les épreuves précédentes. Absent = 0. */
  pointsAcquis: Map<string, number>,
): AthleteClassable[] {
  const dossard = (a: AthleteClassable) => ouInfini(a.dossard);
  const liste = [...athletes];
  if (indexEpreuve <= 0) {
    return liste.sort((a, b) => dossard(a) - dossard(b));
  }
  return liste.sort((a, b) => {
    const pa = pointsAcquis.get(a.id) ?? 0;
    const pb = pointsAcquis.get(b.id) ?? 0;
    if (pa !== pb) return pa - pb;
    return dossard(a) - dossard(b);
  });
}

/* ── Cohérence des catégories de poids ────────────────────────────────── */

export interface BornesCategorie {
  nom: string;
  poidsMin: number | null;
  poidsMax: number | null;
}

/**
 * Cherche les poids qu'aucune catégorie n'accepte, et ceux que deux
 * accepteraient.
 *
 * Les bornes se lisent `poidsMin < poids <= poidsMax`. Deux catégories saisies
 * « moins de 105,5 » et « plus de 105,6 » laissent donc un athlète de 105,6 kg
 * SANS catégorie : il ne peut ni être rangé à la pesée, ni figurer à un
 * classement. Le défaut ne se voit pas en lisant les deux lignes — il faut
 * comparer la borne haute de l'une à la borne basse de l'autre.
 *
 * Rien n'interdit ces bornes : c'est la fédération qui décide. Mais le jour de
 * la pesée est un mauvais moment pour le découvrir.
 */
export function incoherencesCategories(cats: BornesCategorie[]): string[] {
  const soucis: string[] = [];
  // Ordonnées par borne basse, les catégories doivent se toucher exactement.
  const triees = [...cats].sort(
    (a, b) => (a.poidsMin ?? -Infinity) - (b.poidsMin ?? -Infinity),
  );

  for (let i = 0; i < triees.length - 1; i++) {
    const basse = triees[i];
    const haute = triees[i + 1];
    if (basse.poidsMax === null || haute.poidsMin === null) continue;

    if (haute.poidsMin > basse.poidsMax)
      soucis.push(
        `Aucune catégorie n'accepte les poids strictement supérieurs à ` +
          `${basse.poidsMax} kg et jusqu'à ${haute.poidsMin} kg inclus : ` +
          `« ${basse.nom} » s'arrête à ${basse.poidsMax} et ` +
          `« ${haute.nom} » ne commence qu'au-delà de ${haute.poidsMin}.`,
      );
    if (haute.poidsMin < basse.poidsMax)
      soucis.push(
        `« ${basse.nom} » et « ${haute.nom} » se recouvrent entre ` +
          `${haute.poidsMin} et ${basse.poidsMax} kg : un athlète de ce poids ` +
          `pourrait être rangé dans l'une ou l'autre.`,
      );
  }

  // Les extrémités : sans borne ouverte, les poids extrêmes sont exclus.
  if (triees.length > 0) {
    if (triees[0].poidsMin !== null)
      soucis.push(
        `Aucune catégorie n'accepte les poids de ${triees[0].poidsMin} kg ou ` +
          `moins : « ${triees[0].nom} », la plus légère, commence au-dessus.`,
      );
    const derniere = triees[triees.length - 1];
    if (derniere.poidsMax !== null)
      soucis.push(
        `Aucune catégorie n'accepte les poids supérieurs à ` +
          `${derniere.poidsMax} kg : « ${derniere.nom} », la plus lourde, ` +
          `s'arrête là.`,
      );
  }
  return soucis;
}
