/**
 * Validation des saisies.
 *
 * Une règle, et elle explique tout le fichier : **une saisie qu'on ne
 * comprend pas est refusée, jamais réinterprétée en silence.**
 *
 * Le code refusait « abc » dans « Temps imparti » en le transformant en
 * « illimité » — l'épreuve perdait son décompte, et personne n'en était
 * averti avant le premier passage. Même mécanique sur les bornes de poids
 * (borne effacée, donc répartition fausse) et sur la date (compte à rebours
 * du mur LED cassé). Le silence est ici plus coûteux que le refus.
 *
 * Chaque message dit **ce qui est attendu**, pas seulement que c'est faux :
 * la table saisit vite, debout, entre deux passages.
 */

export type Verdict<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

const bon = <T,>(valeur: T): Verdict<T> => ({ ok: true, valeur });
const mauvais = <T,>(erreur: string): Verdict<T> => ({ ok: false, erreur });

/* ── Texte ────────────────────────────────────────────────────────────── */

/**
 * Texte obligatoire, borné.
 *
 * La borne n'est pas décorative : ces libellés partent sur un mur LED en 7 vh.
 * Un nom de 300 caractères ne « déborde » pas, il chasse tout le reste de
 * l'écran.
 */
export function texteObligatoire(
  v: string,
  quoi: string,
  max = 120,
): Verdict<string> {
  const t = v.trim();
  if (!t) return mauvais(`${quoi} ne peut pas être vide.`);
  if (t.length > max)
    return mauvais(`${quoi} : ${max} caractères au maximum (${t.length} saisis).`);
  return bon(t);
}

/** Texte facultatif, borné. Vide devient `null`. */
export function texteFacultatif(
  v: string,
  quoi: string,
  max = 120,
): Verdict<string | null> {
  const t = v.trim();
  if (!t) return bon(null);
  if (t.length > max)
    return mauvais(`${quoi} : ${max} caractères au maximum (${t.length} saisis).`);
  return bon(t);
}

/* ── Nombres ──────────────────────────────────────────────────────────── */

/**
 * Entier facultatif dans un intervalle.
 *
 * On refuse « 12a » au lieu d'en tirer 12 : le dossard 12 existe peut-être, et
 * l'attribuer à la place de celui qui était visé se découvre au micro.
 */
export function entierFacultatif(
  v: string,
  quoi: string,
  min: number,
  max: number,
): Verdict<number | null> {
  const t = v.trim();
  if (!t) return bon(null);
  if (!/^\d+$/.test(t))
    return mauvais(`${quoi} : chiffres uniquement (« ${t} » n'en est pas).`);
  const n = Number.parseInt(t, 10);
  if (n < min || n > max)
    return mauvais(`${quoi} : attendu entre ${min} et ${max}.`);
  return bon(n);
}

/** Entier obligatoire dans un intervalle. */
export function entierObligatoire(
  v: string,
  quoi: string,
  min: number,
  max: number,
): Verdict<number> {
  const r = entierFacultatif(v, quoi, min, max);
  if (!r.ok) return r;
  if (r.valeur === null) return mauvais(`${quoi} est obligatoire.`);
  return bon(r.valeur);
}

/**
 * Nombre décimal facultatif — la virgule française est acceptée.
 *
 * « 104,5 » est ce que la table tape ; le refuser au motif qu'on attend un
 * point serait une pédanterie qui coûte une pesée.
 */
export function decimalFacultatif(
  v: string,
  quoi: string,
  min: number,
  max: number,
): Verdict<number | null> {
  const t = v.trim().replace(",", ".");
  if (!t) return bon(null);
  if (!/^\d+(\.\d+)?$/.test(t))
    return mauvais(`${quoi} : un nombre est attendu (« ${v.trim()} » n'en est pas).`);
  const n = Number.parseFloat(t);
  if (n < min || n > max)
    return mauvais(`${quoi} : attendu entre ${min} et ${max}.`);
  return bon(n);
}

/* ── Durées ───────────────────────────────────────────────────────────── */

/**
 * Temps imparti d'une épreuve : « 60 s », « 90 », ou « illimité ».
 *
 * `null` veut dire illimité — mais seulement quand c'est ÉCRIT. Une saisie
 * incomprise ne doit jamais devenir « illimité » par défaut : les Piliers
 * d'Hercule se tiennent sans limite, le Tirage de camion non, et confondre les
 * deux fausse le passage.
 */
export function tempsImparti(v: string): Verdict<number | null> {
  const t = v.trim().toLowerCase();
  if (!t || /^(illimit[ée]e?|sans limite|aucun|—|-)$/.test(t)) return bon(null);

  const m = t.match(/^(\d+)\s*(s|sec|secondes?|min|minutes?)?$/);
  if (!m)
    return mauvais(
      "Temps imparti : indiquez une durée, par exemple « 60 s », ou « illimité ».",
    );

  const n = Number.parseInt(m[1], 10);
  const secondes = m[2]?.startsWith("min") ? n * 60 : n;
  if (secondes < 1 || secondes > 3600)
    return mauvais("Temps imparti : entre 1 seconde et 1 heure.");
  return bon(secondes);
}

/* ── Valeurs contraintes ──────────────────────────────────────────────── */

/** Valeur devant appartenir à une liste connue. */
export function parmi<T extends string>(
  v: string,
  admises: readonly T[],
  quoi: string,
): Verdict<T> {
  if ((admises as readonly string[]).includes(v)) return bon(v as T);
  return mauvais(`${quoi} : valeur inconnue.`);
}

/* ── Dates ────────────────────────────────────────────────────────────── */

const MOIS_FR: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

/**
 * « Samedi 19 Septembre 2026 » → un jour exploitable.
 *
 * La date reste saisie en français courant : c'est ce qui est recopié de
 * l'arrêté fédéral. Mais une date illisible n'est plus avalée en silence —
 * elle vidait `debutLe`, et avec lui le compte à rebours et la date affichés
 * sur l'écran d'attente.
 */
export function dateFrancaise(v: string): Verdict<{
  jour: number;
  mois: number;
  annee: number;
} | null> {
  const t = v.trim();
  if (!t) return bon(null);

  const m = t.toLowerCase().match(/(\d{1,2})\s+([a-zéûîàôè]+)\s+(\d{4})/);
  if (!m)
    return mauvais(
      "Date : écrivez-la en toutes lettres, par exemple « Samedi 19 Septembre 2026 ».",
    );

  const mois = MOIS_FR[m[2]];
  if (mois === undefined)
    return mauvais(`Date : « ${m[2]} » n'est pas un mois reconnu.`);

  const jour = Number.parseInt(m[1], 10);
  const annee = Number.parseInt(m[3], 10);
  if (jour < 1 || jour > 31) return mauvais("Date : le jour doit aller de 1 à 31.");

  // Un 31 février se saisit sans peine ; il repart en mars sans prévenir.
  const essai = new Date(annee, mois, jour);
  if (essai.getMonth() !== mois)
    return mauvais(`Date : le ${jour} n'existe pas dans ce mois.`);

  return bon({ jour, mois, annee });
}

/** « 14h00 », « 14 h », « 14:00 » → heures et minutes. */
export function heureFrancaise(v: string): Verdict<{
  heures: number;
  minutes: number;
} | null> {
  const t = v.trim();
  if (!t) return bon(null);

  const m = t.match(/^(\d{1,2})\s*[h:]\s*(\d{2})?$/i);
  if (!m)
    return mauvais("Heure : écrivez-la sous la forme « 14h00 ».");

  const heures = Number.parseInt(m[1], 10);
  const minutes = m[2] ? Number.parseInt(m[2], 10) : 0;
  if (heures > 23) return mauvais("Heure : les heures vont de 0 à 23.");
  if (minutes > 59) return mauvais("Heure : les minutes vont de 0 à 59.");
  return bon({ heures, minutes });
}
