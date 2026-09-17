/**
 * Charte graphique et vocabulaire d'affichage — repris tel quel du logiciel
 * d'origine (« Arbitrage Strongman 2026 big fred - autonome.html »).
 *
 * Tout ce qui décide d'une couleur, d'un libellé ou d'une mise en forme à
 * l'écran est ici, et nulle part ailleurs. Les valeurs ne sont pas
 * « inspirées » de l'original : ce sont les siennes, à l'octet près, pour
 * qu'un officiel qui a appris le logiciel sur le poste autonome retrouve
 * exactement les mêmes repères visuels.
 */

/* ── Couleurs ─────────────────────────────────────────────────────────── */

export const C = {
  papier: "#FCFAF6",
  papier2: "#F5F1E8",
  papier3: "#F0EBE1",
  blanc: "#FFFFFF",
  encre: "#141210",
  encre2: "#4A443B",
  encre3: "#6E675C",
  encre4: "#8A8378",
  encre5: "#B8B0A2",
  bordure: "#E7E1D6",
  bordure2: "#DDD6C9",
  vert: "#0B9237",
  vertFonce: "#03562A",
  orange: "#EC6D23",
  orangeFonce: "#BC4F14",
  orangeClair: "#F7A76C",
  rouge: "#C4361F",
  rougeFonce: "#A6371C",
  rougeFond: "#FBEFEA",
  rougeBord: "#E9CFC4",
  ambreFond: "#FFF6E8",
  ambreBord: "#F0D8B0",
  ambreTrait: "#E8A317",
  ambreEncre: "#8A5A0B",
  nuit: "#0A0D0B",
} as const;

/** Bandeau de couleur des épreuves, dans l'ordre du programme. */
export const BANDES = [
  "#EC6D23",
  "#0B9237",
  "#141210",
  "#CB7C4A",
  "#03562A",
] as const;

/**
 * Couleur d'une catégorie : elle suit son rang dans la liste, jamais son nom.
 * Sept couleurs, puis on recommence — une compétition à huit catégories
 * réutilise la première, ce qui reste plus lisible qu'une couleur inventée.
 */
export const COUL_CAT = [
  "#EC6D23",
  "#0B9237",
  "#3E7CB1",
  "#B4692F",
  "#8E44AD",
  "#C4361F",
  "#0F8B8D",
] as const;

export const couleurCategorie = (index: number): string =>
  COUL_CAT[(index < 0 ? 6 : index) % COUL_CAT.length];

/** Une couleur saisie : `#RRGGBB`, majuscules ou non. */
export const COULEUR_HEX = /^#[0-9a-f]{6}$/i;

/** Or, argent, bronze — dans cet ordre, pour le podium et les récompenses. */
export const COUL_METAL = ["#D9A441", "#9AA0A6", "#B4692F"] as const;
export const METAUX = [
  "Médaille d'or",
  "Médaille d'argent",
  "Médaille de bronze",
] as const;

export const couleurMetal = (index: number): string =>
  COUL_METAL[index] ?? "#8A8378";

/* ── Pays ─────────────────────────────────────────────────────────────── */

/** Nom en clair et trois bandes du drapeau. Rien d'autre n'est affiché. */
export const PAYS: Record<string, { n: string; c: [string, string, string] }> = {
  CIV: { n: "Côte d'Ivoire", c: ["#EC6D23", "#FFFFFF", "#0B9237"] },
  BEN: { n: "Bénin", c: ["#0B9237", "#FCD116", "#E8112D"] },
  BFA: { n: "Burkina Faso", c: ["#EF2B2D", "#EF2B2D", "#009E49"] },
  CMR: { n: "Cameroun", c: ["#007A5E", "#CE1126", "#FCD116"] },
  FRA: { n: "France", c: ["#002395", "#FFFFFF", "#ED2939"] },
  GHA: { n: "Ghana", c: ["#CE1126", "#FCD116", "#006B3F"] },
  GIN: { n: "Guinée", c: ["#CE1126", "#FCD116", "#009460"] },
  MAR: { n: "Maroc", c: ["#C1272D", "#C1272D", "#006233"] },
  MLI: { n: "Mali", c: ["#14B53A", "#FCD116", "#CE1126"] },
  NGA: { n: "Nigéria", c: ["#008751", "#FFFFFF", "#008751"] },
  SEN: { n: "Sénégal", c: ["#00853F", "#FDEF42", "#E31B23"] },
  TGO: { n: "Togo", c: ["#006A4E", "#FFCE00", "#D21034"] },
  USA: { n: "États-Unis", c: ["#B22234", "#FFFFFF", "#3C3B6E"] },
  ISL: { n: "Islande", c: ["#02529C", "#FFFFFF", "#DC1E35"] },
};

export const pays = (code: string | null | undefined) =>
  PAYS[code ?? "CIV"] ?? PAYS.CIV;

/** L'ordre du menu déroulant du fichier d'origine : alphabétique en français. */
export const PAYS_OPTIONS: { code: string; nom: string }[] = [
  "BEN",
  "BFA",
  "CMR",
  "CIV",
  "USA",
  "FRA",
  "GHA",
  "GIN",
  "ISL",
  "MLI",
  "MAR",
  "NGA",
  "SEN",
  "TGO",
].map((code) => ({ code, nom: PAYS[code].n }));

/* ── Mesures et rôles ─────────────────────────────────────────────────── */

export const MESURES = [
  {
    cle: "nb_temps",
    lbl: "Nombre, puis temps",
    aide: "la quantité classe ; à égalité, le temps intermédiaire de la dernière répétition départage",
  },
  {
    cle: "poids",
    lbl: "Charge maximale (kg)",
    aide: "la charge la plus lourde validée l'emporte",
  },
  {
    cle: "duree",
    lbl: "Temps de maintien",
    aide: "le temps le plus long l'emporte",
  },
  {
    cle: "chrono",
    lbl: "Temps sur distance",
    aide: "le temps le plus court l'emporte",
  },
  {
    cle: "distance",
    lbl: "Distance parcourue (m)",
    aide: "la distance classe ; à distance égale, le temps le plus rapide",
  },
  {
    cle: "medley",
    lbl: "Medley — parcours à ateliers",
    aide: "distance parcourue dans le temps imparti ; à distance égale, le temps le plus rapide",
  },
] as const;

export const aideMesure = (cle: string): string =>
  MESURES.find((m) => m.cle === cle)?.aide ?? "";

export const ROLES = [
  { cle: "directeur", lbl: "Directeur de compétition" },
  { cle: "technique", lbl: "Responsable technique" },
  { cle: "arbitrage", lbl: "Responsable arbitrage" },
  { cle: "juge", lbl: "Juge principal" },
  { cle: "chrono", lbl: "Chronométreur" },
  { cle: "secretaire", lbl: "Secrétaire de table" },
  { cle: "regie", lbl: "Régie" },
  { cle: "speaker", lbl: "Speaker" },
] as const;

export const libelleRole = (cle: string): string =>
  ROLES.find((r) => r.cle === cle)?.lbl ?? cle;

/** Intitulé de la case de saisie au plateau, selon ce qui est mesuré. */
export const uniteValeur = (mesure: string | null | undefined): string =>
  ({
    distance: "Distance (m)",
    medley: "Distance parcourue (m)",
    duree: "Durée tenue (s)",
    poids: "Charge (kg)",
    chrono: "Temps (s)",
  })[mesure ?? ""] ?? "Nombre validé";

/** Intitulé de la case du temps de départage. */
export const libelleTemps = (mesure: string | null | undefined): string =>
  mesure === "distance" || mesure === "medley" || mesure === "chrono"
    ? "Temps mis (s)"
    : "Temps du dernier tour (s)";

/** Le barème des clubs, tel qu'on l'annonce au micro. */
export const POINTS_CLUB_LISIBLE =
  "à chaque épreuve, 1er : 15 pts · 2e : 10 · 3e : 5 · 4e : 4 · 5e : 3 · classé : 1, cumulés";

/** La troisième case : le temps lu au chronomètre quand il s'arrête. */
export const LIBELLE_CHRONO = "Temps au chrono (s)";
/** Elle n'a pas de sens quand le temps EST la performance. */
export const aCaseChrono = (mesure: string | null | undefined): boolean =>
  mesure !== "chrono" && mesure !== "duree";

/** Une deuxième case de saisie n'apparaît que si le temps départage. */
export const mesureMixte = (mesure: string | null | undefined): boolean =>
  mesure === "nb_temps" || mesure === "distance" || mesure === "medley";

/** Unité accolée à la performance dans les listes et sur le mur LED. */
export const uniteCourte = (mesure: string | null | undefined): string =>
  ({
    nb_temps: "",
    poids: " kg",
    duree: " s",
    chrono: " s",
    distance: " m",
    medley: " m",
  })[mesure ?? ""] ?? "";

/* ── Mise en forme ────────────────────────────────────────────────────── */

/** Les nombres s'écrivent à la française : la virgule, jamais le point. */
export const virgule = (v: number | string | null | undefined): string =>
  v === null || v === undefined ? "—" : String(v).replace(".", ",");

/** mm:ss,d — la forme du chronomètre du plateau et du mur LED. */
export function mmss(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const d = Math.floor((s * 10) % 10);
  return `${m < 10 ? "0" : ""}${m}:${r < 10 ? "0" : ""}${r},${d}`;
}

/** Durée écrite dans la fiche d'épreuve (« 60 s », « Illimité »). */
export function parseDuree(txt: string | null | undefined): number {
  const m = String(txt ?? "").match(/\d+/);
  return m ? Number.parseInt(m[0], 10) : 0;
}

/** NOM en capitales, prénoms tels quels — la règle d'annonce du speaker. */
export const nomComplet = (a: {
  nom: string;
  prenoms: string | null;
}): string => `${a.nom.toUpperCase()} ${a.prenoms ?? ""}`.trim() || "Athlète";

export const initiales = (a: {
  nom: string | null;
  prenoms: string | null;
}): string =>
  ((a.nom || "?").charAt(0) + (a.prenoms || "").charAt(0)).toUpperCase();

/** Un club vide s'affiche « Indépendant » : jamais une case blanche. */
export const clubAffiche = (club: string | null | undefined): string =>
  club && club.trim() ? club : "Indépendant";

export const dossardTexte = (d: number | null | undefined): string =>
  d === null || d === undefined ? "—" : String(d);

/** Fond CSS d'une photo, ou `none` : la forme attendue par `background-image`. */
export const fondImage = (url: string | null | undefined): string =>
  url ? `url("${url}")` : "none";

/**
 * La performance, écrite de façon à JUSTIFIER le classement.
 *
 * Le règlement d'une épreuve « nombre, puis temps » repose sur trois
 * variables : le nombre de répétitions validées, le temps imparti, et
 * l'instant exact de la dernière répétition valide. Le nombre prime toujours —
 * quinze répétitions passent devant dix, quel que soit le temps — et l'instant
 * ne sert qu'à départager une égalité.
 *
 * Le tableau n'affichait que le nombre. Deux athlètes à trois répétitions y
 * apparaissaient donc dans un ordre que rien ne venait expliquer, et un juge
 * sommé de justifier un départage n'avait rien à montrer. On écrit les deux.
 */
export function performanceLisible(
  mesure: string | null | undefined,
  valeur: number | null,
  temps: number | null,
): string {
  if (valeur === null) return "—";
  const v = virgule(valeur);

  switch (mesure) {
    case "nb_temps":
      return temps === null
        ? `${v} rép.`
        : `${v} rép. · dernière à ${virgule(temps)} s`;
    case "distance":
    case "medley":
      return temps === null ? `${v} m` : `${v} m · ${virgule(temps)} s`;
    case "poids":
      return `${v} kg`;
    case "duree":
    case "chrono":
      return `${v} s`;
    default:
      return temps === null ? v : `${v} · ${virgule(temps)} s`;
  }
}

/**
 * Le temps imparti, tel qu'il s'annonce en tête de tableau.
 *
 * C'est la troisième variable du règlement, et elle est la même pour tout le
 * monde : elle se dit une fois en en-tête plutôt que de se répéter sur chaque
 * ligne.
 */
export function tempsImpartiLisible(secondes: number | null): string {
  if (secondes === null) return "temps illimité";
  return `${secondes} s imparties`;
}

/* ── Thème des écrans publics ─────────────────────────────────────────── */

export type ThemeEcran = "nuit" | "jour";

/**
 * Le mur LED se règle en nuit ou en jour depuis la régie. Les deux jeux de
 * couleurs sont ceux du fichier d'origine : le mode nuit reste lisible en
 * plein soleil et n'éblouit pas après 19 h.
 */
export function theme(t: ThemeEcran) {
  const nuit = t === "nuit";
  return {
    fond: nuit ? "#0A0D0B" : "#FCFAF6",
    encre: nuit ? "#FCFAF6" : "#141210",
    second: nuit ? "#9AA79E" : "#6E675C",
    carte: nuit ? "#141A16" : "#FFFFFF",
    bord: nuit ? "#26302A" : "#E7E1D6",
  };
}
