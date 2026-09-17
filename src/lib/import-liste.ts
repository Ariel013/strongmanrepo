/**
 * Lecture d'une liste d'engagés — fichier CSV, ou texte collé.
 *
 * Le poste d'origine acceptait aussi Word et PDF, au prix d'une bibliothèque
 * chargée à la volée. Ici on s'en tient à ce qui est fiable et vérifiable :
 * CSV, texte séparé par des tabulations (ce que produit un copier-coller
 * depuis Excel) et texte libre, une personne par ligne.
 *
 * Le parti pris tient en une phrase : **on ne devine jamais en silence**.
 * Chaque valeur déduite plutôt que lue laisse un motif sur la ligne, la ligne
 * s'affiche en rose, et la fiche créée porte la marque « À vérifier » jusqu'à
 * relecture par un officiel. Une liste importée sans avertissement est une
 * liste qu'on croit juste.
 */

/** Une ligne lue, telle qu'elle est proposée à la vérification. */
export interface LigneImport {
  nom: string;
  prenoms: string;
  club: string;
  poids: string;
  telephone: string;
  urgence: string;
  /** `AAAA-MM-JJ` si lisible, sinon vide — on ne devine jamais une date. */
  dateNaissance: string;
  /** Ce qui a été déduit plutôt que lu. Vide = ligne sûre. */
  motifs: string[];
}

const sansAcc = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Colonnes reconnues dans une ligne d'en-tête. */
const COLONNES: { cle: keyof LigneImport | "nomComplet"; mots: string[] }[] = [
  { cle: "nomComplet", mots: ["nom et prenoms", "nom complet", "athlete", "nom & prenoms"] },
  { cle: "nom", mots: ["nom", "nom de famille", "patronyme"] },
  { cle: "prenoms", mots: ["prenom", "prenoms"] },
  { cle: "club", mots: ["club", "equipe", "structure", "association"] },
  { cle: "poids", mots: ["poids", "poids declare", "kg", "masse"] },
  { cle: "telephone", mots: ["telephone", "tel", "contact", "numero", "portable"] },
  { cle: "urgence", mots: ["urgence", "contact urgence", "a prevenir", "personne a prevenir"] },
  { cle: "dateNaissance", mots: ["date de naissance", "naissance", "ne le", "nee le", "ddn"] },
];

/**
 * Lit une date telle qu'on l'écrit sur une liste ivoirienne — « 14/03/1998 »
 * ou « 14-03-1998 » — ou déjà au format ISO. Tout le reste reste vide : une
 * date devinée serait un âge faux sur la fiche.
 */
function lireDate(v: string): string {
  const t = v.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

/** Le fichier vierge proposé par « Télécharger le modèle ». */
export const MODELE_CSV =
  "Nom;Prénoms;Club;Poids;Téléphone;Contact d'urgence;Date de naissance\n" +
  "KONÉ;Ibrahim;Iron Club Abidjan;118;07 00 00 00 00;Awa Koné 05 00 00 00 00;14/03/1998\n";

/** Le séparateur majoritaire des lignes non vides : `;`, `,` ou tabulation. */
function separateur(lignes: string[]): string | null {
  const candidats = ["\t", ";", ","];
  let meilleur: string | null = null;
  let score = 0;
  for (const c of candidats) {
    // Une colonne isolée ne fait pas un tableau : il en faut au moins deux,
    // et sur la majorité des lignes, sinon une virgule dans un nom de club
    // suffirait à faire croire à un CSV.
    const compte = lignes.filter((l) => l.split(c).length >= 2).length;
    if (compte > score && compte >= lignes.length / 2) {
      score = compte;
      meilleur = c;
    }
  }
  return meilleur;
}

/** Sépare « KONÉ Ibrahim Serge » en nom et prénoms. */
function couperNom(entier: string): {
  nom: string;
  prenoms: string;
  devine: boolean;
} {
  const mots = entier.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return { nom: "", prenoms: "", devine: false };
  if (mots.length === 1) return { nom: mots[0], prenoms: "", devine: false };

  // Convention d'usage sur les listes fédérales : le nom de famille est
  // écrit en capitales. Quand elle est respectée, on ne devine rien.
  const capitales = mots.filter(
    (m) => m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m),
  );
  if (capitales.length > 0 && capitales.length < mots.length) {
    return {
      nom: capitales.join(" "),
      prenoms: mots.filter((m) => !capitales.includes(m)).join(" "),
      devine: false,
    };
  }
  // Sinon : premier mot = nom. C'est l'usage local, mais c'est une
  // supposition — elle est signalée.
  return { nom: mots[0], prenoms: mots.slice(1).join(" "), devine: true };
}

const POIDS = /(\d{2,3}(?:[.,]\d)?)\s*(?:kg)?/i;
const TELEPHONE = /(?:\+?\d[\d\s.-]{7,})/g;

/** Lit une ligne de texte libre : « KONÉ Ibrahim — Iron Club — 118 kg — 07… ». */
function lireTexteLibre(brut: string): LigneImport {
  const motifs: string[] = [];
  let reste = brut;

  const tels = reste.match(TELEPHONE) ?? [];
  for (const t of tels) reste = reste.replace(t, " ");

  // Le poids ne se cherche qu'après avoir retiré les téléphones : sinon les
  // premiers chiffres d'un numéro passeraient pour une masse.
  const mPoids = reste.match(POIDS);
  let poids = "";
  if (mPoids) {
    const v = Number.parseFloat(mPoids[1].replace(",", "."));
    if (v >= 40 && v <= 250) {
      poids = mPoids[1];
      reste = reste.replace(mPoids[0], " ");
      if (!/kg/i.test(brut)) motifs.push("poids déduit");
    }
  }

  const morceaux = reste
    .split(/\s*[—–\-|;,/]\s*|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const { nom, prenoms, devine } = couperNom(morceaux[0] ?? "");
  if (devine) motifs.push("nom et prénoms séparés au jugé");

  const club = morceaux[1] ?? "";
  if (!club) motifs.push("club absent");

  return {
    nom,
    prenoms,
    club,
    poids,
    telephone: (tels[0] ?? "").trim(),
    urgence: (tels[1] ?? "").trim(),
    dateNaissance: "",
    motifs,
  };
}

/**
 * Lit une liste entière.
 *
 * Rend les lignes dans l'ordre du fichier, doublons compris : c'est l'écran
 * de vérification qui décide de ce qui entre, jamais cette fonction.
 */
export function lireListe(texte: string): LigneImport[] {
  const lignes = texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lignes.length === 0) return [];

  const sep = separateur(lignes);
  if (!sep) return lignes.map(lireTexteLibre);

  const cellules = lignes.map((l) => l.split(sep).map((c) => c.trim()));

  // En-tête : une première ligne dont au moins deux cellules nomment une
  // colonne connue. Sans cela, une liste sans en-tête perdrait sa première
  // personne.
  const premiere = cellules[0].map(sansAcc);
  const index: Partial<Record<string, number>> = {};
  let reconnues = 0;
  premiere.forEach((c, i) => {
    for (const col of COLONNES) {
      if (col.mots.includes(c) && index[col.cle] === undefined) {
        index[col.cle] = i;
        reconnues++;
        return;
      }
    }
  });

  const corps = reconnues >= 2 ? cellules.slice(1) : cellules;

  return corps.map((c) => {
    if (reconnues >= 2) {
      const lire = (cle: string) => {
        const i = index[cle];
        return i === undefined ? "" : (c[i] ?? "");
      };
      const motifs: string[] = [];
      let nom = lire("nom");
      let prenoms = lire("prenoms");

      if (!nom && index.nomComplet !== undefined) {
        const d = couperNom(lire("nomComplet"));
        nom = d.nom;
        prenoms = d.prenoms;
        if (d.devine) motifs.push("nom et prénoms séparés au jugé");
      }
      if (!nom) motifs.push("nom absent");
      const club = lire("club");
      if (!club) motifs.push("club absent");

      return {
        nom,
        prenoms,
        club,
        poids: (lire("poids").match(POIDS)?.[1] ?? "").trim(),
        telephone: lire("telephone"),
        urgence: lire("urgence"),
        dateNaissance: lireDate(lire("dateNaissance")),
        motifs,
      };
    }

    // Colonnes non nommées : on suppose l'ordre du modèle, et on le dit.
    const [a = "", b = "", d = "", e = "", f = "", g = "", h = ""] = c;
    const motifs = ["colonnes non nommées, ordre du modèle supposé"];
    const coupe = b ? { nom: a, prenoms: b, devine: false } : couperNom(a);
    if (coupe.devine) motifs.push("nom et prénoms séparés au jugé");
    return {
      nom: coupe.nom,
      prenoms: coupe.prenoms,
      club: d,
      poids: (e.match(POIDS)?.[1] ?? "").trim(),
      telephone: f,
      urgence: g,
      dateNaissance: lireDate(h),
      motifs,
    };
  });
}

/**
 * Repère une fiche déjà présente.
 *
 * Comparaison sur le nom et le premier prénom, sans accents ni casse : c'est
 * ce qui rattrape « KONÉ Ibrahim » et « Kone ibrahim serge » comme la même
 * personne, sans confondre deux frères aux prénoms différents.
 */
export function cleRapprochement(nom: string, prenoms: string): string {
  const p = prenoms.trim().split(/\s+/)[0] ?? "";
  return `${sansAcc(nom)}|${sansAcc(p)}`;
}
