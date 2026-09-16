/**
 * Préparation des images AVANT envoi — dans le navigateur.
 *
 * Deux raisons, et la première est un mur : une Server Action n'accepte qu'un
 * mégaoctet de corps de requête par défaut, et la plateforme plafonne de toute
 * façon autour de 4,5 Mo. Une photo de téléphone en pèse 2 à 5 : elle était
 * donc refusée par un `413` brut, avant même d'atteindre le code qui vérifie
 * sa taille — l'écran se contentait de casser.
 *
 * La seconde raison tient au lieu : on téléverse depuis le bord du plateau,
 * sur un réseau de salle. Envoyer 4 Mo pour afficher une vignette de 74 px est
 * une attente que personne n'a à subir entre deux passages.
 *
 * Le poste d'origine faisait déjà ce travail — « les photos sont recadrées en
 * portrait automatiquement ».
 */

/** Ce qu'on garde au maximum, en pixels, dans chaque mode. */
const LARGEUR_MAX = 1200;
const HAUTEUR_MAX = 1600;

/** Format des vignettes d'athlète : 3/4, portrait, partout dans l'interface. */
const RAPPORT_PORTRAIT = 3 / 4;

export type ModeImage =
  /** Photo d'athlète : recadrée en portrait, comme sur le poste d'origine. */
  | "portrait"
  /** Logo de club : jamais recadré, il serait amputé. Seulement réduit. */
  | "entier";

/** Le découpage et la mise à l'échelle, séparés du navigateur pour être testés. */
export interface Recadrage {
  /** Zone retenue dans l'image source. */
  xSource: number;
  ySource: number;
  lSource: number;
  hSource: number;
  /** Dimensions finales. */
  largeur: number;
  hauteur: number;
}

/**
 * Décide quoi garder de l'image et à quelle taille.
 *
 * En mode portrait, on RECADRE au centre plutôt que de déformer : un visage
 * étiré se voit à sept vh sur un mur LED. Et on n'agrandit jamais une petite
 * image — cela n'ajoute aucun détail et ne fait que gonfler le fichier.
 */
export function calculerRecadrage(
  largeurSource: number,
  hauteurSource: number,
  mode: ModeImage,
): Recadrage {
  let lSource = largeurSource;
  let hSource = hauteurSource;
  let xSource = 0;
  let ySource = 0;

  if (mode === "portrait") {
    if (lSource / hSource > RAPPORT_PORTRAIT) {
      const voulue = hSource * RAPPORT_PORTRAIT;
      xSource = (lSource - voulue) / 2;
      lSource = voulue;
    } else {
      const voulue = lSource / RAPPORT_PORTRAIT;
      ySource = (hSource - voulue) / 2;
      hSource = voulue;
    }
  }

  const facteur = Math.min(1, LARGEUR_MAX / lSource, HAUTEUR_MAX / hSource);
  return {
    xSource,
    ySource,
    lSource,
    hSource,
    largeur: Math.round(lSource * facteur),
    hauteur: Math.round(hSource * facteur),
  };
}

/**
 * En dessous de cette largeur, la photo sera visiblement pixellisée sur le mur
 * LED, où elle occupe 19 vw de large. Mieux vaut le dire au moment du dépôt
 * qu'au moment du passage, devant la salle.
 */
const LARGEUR_CONFORTABLE = 600;

export interface ImagePreparee {
  fichier: File;
  /** Pour dire à l'officiel ce qui s'est passé, plutôt que de le taire. */
  avant: number;
  apres: number;
  /** Dimensions finales, ou `null` si l'image n'a pas pu être lue. */
  largeur: number | null;
  hauteur: number | null;
  /** Non bloquant : la photo est acceptée, mais elle sera de piètre qualité. */
  tropPetite: boolean;
}

/**
 * Réduit, recadre et recompresse une image choisie par l'utilisateur.
 *
 * Rend le fichier d'origine tel quel si le navigateur ne sait pas faire — un
 * poste ancien doit pouvoir déposer une photo, quitte à ce qu'elle soit
 * lourde ; c'est le serveur qui tranchera.
 */
export async function preparerImage(
  fichier: File,
  mode: ModeImage = "portrait",
): Promise<ImagePreparee> {
  const tel = (f: File): ImagePreparee => ({
    fichier: f,
    avant: fichier.size,
    apres: f.size,
    largeur: null,
    hauteur: null,
    tropPetite: false,
  });

  if (!fichier.type.startsWith("image/")) return tel(fichier);

  try {
    // `from-image` applique la rotation EXIF : sans elle, une photo prise en
    // portrait avec un téléphone arrive couchée sur le mur LED.
    const source = await createImageBitmap(fichier, {
      imageOrientation: "from-image",
    });

    const r = calculerRecadrage(source.width, source.height, mode);
    const { xSource, ySource, lSource, hSource, largeur, hauteur } = r;

    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;
    const ctx = toile.getContext("2d");
    if (!ctx) {
      source.close();
      return tel(fichier);
    }
    ctx.drawImage(
      source,
      xSource,
      ySource,
      lSource,
      hSource,
      0,
      0,
      largeur,
      hauteur,
    );
    source.close();

    const blob = await new Promise<Blob | null>((r) =>
      toile.toBlob(r, "image/jpeg", 0.82),
    );
    const tropPetite = largeur < LARGEUR_CONFORTABLE;
    if (!blob) return { ...tel(fichier), largeur, hauteur, tropPetite };

    // Si la recompression n'a rien gagné — petite image déjà optimisée — on
    // garde l'originale, qui est de meilleure qualité.
    if (blob.size >= fichier.size)
      return { ...tel(fichier), largeur, hauteur, tropPetite };

    const nom = fichier.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      fichier: new File([blob], nom, { type: "image/jpeg" }),
      avant: fichier.size,
      apres: blob.size,
      largeur,
      hauteur,
      tropPetite,
    };
  } catch {
    // Navigateur sans `createImageBitmap`, image corrompue, mémoire
    // insuffisante : on laisse passer l'originale et le serveur décidera.
    return tel(fichier);
  }
}

/** « 2,4 Mo », « 312 ko » — pour dire ce qui a été envoyé. */
export function poidsLisible(octets: number): string {
  if (octets >= 1024 * 1024)
    return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.round(octets / 1024)} ko`;
}
