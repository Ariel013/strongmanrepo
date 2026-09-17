/**
 * Schéma de la base — Drizzle / PostgreSQL.
 *
 * Deux partis pris structurants, posés dès la première migration :
 *
 * 1. Les points et les rangs ne sont PAS stockés. Ils se recalculent à partir
 *    des résultats (voir `src/lib/classement.ts`). Un classement figé en base
 *    devient faux à la première disqualification.
 *
 * 2. Les données personnelles (téléphone, contact d'urgence) vivent dans une
 *    table séparée, `athleteContact`. Les écrans publics lisent `athlete` et
 *    ne peuvent donc pas exfiltrer un numéro, même sur une requête trop large
 *    ou un `select *` distrait. Le cloisonnement coûte une jointure au jour 1
 *    et évite une fuite le jour J.
 */

import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ── Compétition ──────────────────────────────────────────────────────── */

/**
 * Le MVP n'en gère qu'une, mais la table existe dès maintenant : ajouter la
 * colonne plus tard obligerait à rétro-remplir toutes les autres tables.
 */
export const competition = pgTable("competition", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  lieu: text("lieu"),
  adresse: text("adresse"),
  debutLe: timestamp("debut_le", { withTimezone: true }),
  finLe: timestamp("fin_le", { withTimezone: true }),

  /** Épreuve et catégorie actuellement au plateau — pilote les écrans publics. */
  epreuveCouranteId: uuid("epreuve_courante_id"),
  categorieCouranteId: uuid("categorie_courante_id"),

  /** Compétition interrompue (blessure, panne, réclamation) et son motif. */
  suspendue: boolean("suspendue").notNull().default(false),
  motifSuspension: text("motif_suspension"),

  /**
   * Bandeau partenaires, défilant sur l'écran d'attente : une simple liste de
   * noms séparés par des virgules, comme sur le poste d'origine. Rien
   * n'impose de la structurer tant que rien n'est calculé dessus.
   */
  partenaires: text("partenaires"),

  /** Réglage du mur LED : `nuit` (défaut, extérieur) ou `jour`. */
  themeEcran: text("theme_ecran").notNull().default("nuit"),

  /**
   * État du chronomètre, partagé avec le mur LED.
   *
   * Le poste autonome gardait le chrono dans le navigateur, et ses fenêtres
   * écrans le lisaient parce qu'elles tournaient sur la même machine. Ici les
   * écrans sont sur d'autres postes : le chrono doit donc vivre en base, ou
   * le mur LED afficherait un compteur figé pendant que l'athlète travaille.
   *
   * Seul l'INSTANT DE DÉPART est enregistré, jamais le temps écoulé : chaque
   * écran calcule l'affichage depuis `chronoDebutLe`, et reste juste au
   * dixième même s'il n'est rafraîchi que toutes les deux secondes.
   *
   * `chronoPhase` : pret | encours | arrete
   */
  chronoPhase: text("chrono_phase").notNull().default("pret"),
  chronoDebutLe: timestamp("chrono_debut_le", { withTimezone: true }),
  /** Décompte préparé, en secondes. 0 = chronomètre montant. */
  chronoDureeS: integer("chrono_duree_s").notNull().default(0),
  /** Temps figé à l'arrêt, en secondes — ce que le mur LED doit garder. */
  chronoArretS: real("chrono_arret_s"),

  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  majLe: timestamp("maj_le", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Catégories de poids ──────────────────────────────────────────────── */

/**
 * Bornes : un athlète entre dans la catégorie si `poidsMin < poids <= poidsMax`.
 * La borne haute est donc inclusive et la basse exclusive — « −105 kg » se
 * saisit `(null, 105)` et « +105 kg » `(105, null)`, sans recouvrement à
 * 105,0 kg exactement.
 */
export const categorie = pgTable(
  "categorie",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
    poidsMin: real("poids_min"),
    poidsMax: real("poids_max"),
    /** Une catégorie mise de côté ne concourt pas mais reste dans l'historique. */
    active: boolean("active").notNull().default(true),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("categorie_competition_idx").on(t.competitionId)],
);

/* ── Épreuves ─────────────────────────────────────────────────────────── */

/**
 * `mesure` détermine le sens du classement : seule « chrono » se classe à
 * l'envers (le plus petit temps gagne). Valeurs admises :
 * nb_temps | poids | duree | distance | chrono.
 */
export const epreuve = pgTable(
  "epreuve",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
    mesure: text("mesure").notNull(),
    /** Temps imparti en secondes. `null` = illimité (épreuves de maintien). */
    tempsLimiteS: integer("temps_limite_s"),
    essais: integer("essais").notNull().default(1),
    critere: text("critere"),
    materiel: text("materiel"),
    equipements: text("equipements"),

    /**
     * Ordre de passage : `groupe` (une catégorie après l'autre) ou `melange`
     * (tout le monde dans un seul ordre). Les classements restent séparés
     * par catégorie dans les deux cas — c'est le passage qui change, pas le
     * barème.
     */
    passage: text("passage").notNull().default("groupe"),

    /**
     * Épreuve à niveaux : chaque athlète déclare le sien (hauteur de prise,
     * cran, palier). `niveauxOptions` porte les intitulés proposés, séparés
     * par des virgules, tels qu'ils sont saisis par la table.
     */
    niveau: boolean("niveau").notNull().default(false),
    niveauxOptions: text("niveaux_options"),

    /** Le juge compte les répétitions au bouton « Tour » pendant le passage. */
    tours: boolean("tours").notNull().default(false),

    /* ── Medley : parcours à ateliers enchaînés ── */
    /** Un atelier par ligne, dans l'ordre de passage. */
    ateliers: text("ateliers"),
    distanceTotale: text("distance_totale"),
    /** Ce qui est retenu si l'athlète n'achève pas le parcours. */
    regleFin: text("regle_fin"),

    /** Ordre au programme : fixe aussi l'ordre de passage (cf. classement.ts). */
    position: integer("position").notNull().default(0),
  },
  (t) => [index("epreuve_competition_idx").on(t.competitionId)],
);

/* ── Athlètes ─────────────────────────────────────────────────────────── */

export const athlete = pgTable(
  "athlete",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),

    nom: text("nom").notNull(),
    prenoms: text("prenoms").notNull().default(""),
    club: text("club"),
    /** Code ISO à 3 lettres. Sert au drapeau affiché, rien de plus. */
    pays: text("pays").notNull().default("CIV"),

    /** Poids de corps constaté à la pesée, en kg. Départage les ex æquo. */
    poidsCorps: numeric("poids_corps", { precision: 5, scale: 1 }),
    /** Poids annoncé à l'inscription, conservé pour comparaison. */
    poidsDeclare: numeric("poids_declare", { precision: 5, scale: 1 }),
    /** Pesée validée par un officiel : la fiche ne doit plus bouger. */
    peseeValidee: boolean("pesee_validee").notNull().default(false),

    categorieId: uuid("categorie_id").references(() => categorie.id, {
      onDelete: "set null",
    }),
    dossard: integer("dossard"),

    /**
     * Explicite, jamais déduit de la nationalité : un invité étranger peut
     * très bien devoir être classé, et un local peut concourir hors match.
     */
    horsClassement: boolean("hors_classement").notNull().default(false),

    /** URL Vercel Blob. La photo elle-même ne transite jamais par la base. */
    photoUrl: text("photo_url"),

    tailleCm: integer("taille_cm"),
    note: text("note"),

    /**
     * Niveau déclaré par épreuve, en JSON `{ epreuveId: "Niveau 2" }`.
     *
     * Une table dédiée serait plus orthodoxe, mais rien n'est jamais calculé
     * ni classé là-dessus : le niveau ne sert qu'à être affiché sur la fiche,
     * dans la file d'attente et sur le mur LED. Une colonne JSON dit la
     * vérité sur cet usage, une table ferait croire à un lien exploité.
     */
    niveaux: text("niveaux"),

    /**
     * Fiche importée dont une donnée a été devinée : elle est marquée « À
     * vérifier » tant qu'un officiel ne l'a pas relue.
     */
    aVerifier: boolean("a_verifier").notNull().default(false),

    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("athlete_competition_idx").on(t.competitionId),
    index("athlete_categorie_idx").on(t.categorieId),
    uniqueIndex("athlete_dossard_unique").on(t.competitionId, t.dossard),
  ],
);

/**
 * Données personnelles — table séparée, jamais lue par les routes publiques.
 * Voir l'en-tête de ce fichier.
 */
export const athleteContact = pgTable("athlete_contact", {
  athleteId: uuid("athlete_id")
    .primaryKey()
    .references(() => athlete.id, { onDelete: "cascade" }),
  telephone: text("telephone"),
  contactUrgence: text("contact_urgence"),
  commune: text("commune"),

  /**
   * La date de naissance vit ICI, pas sur `athlete` : c'est une donnée
   * personnelle au même titre que le téléphone, et un écran public n'a aucune
   * raison de la lire. L'âge, lui, se CALCULE — il n'est jamais stocké. Un
   * âge saisi à la main était faux dès l'anniversaire suivant, et l'ancienne
   * colonne `age` a été retirée pour cette raison.
   */
  dateNaissance: date("date_naissance"),
});

/* ── Passages ─────────────────────────────────────────────────────────── */

/**
 * Un passage = un athlète sur une épreuve. Il porte à la fois la file
 * d'attente (`statut`, `ordre`) et la performance (`resultat*`).
 *
 * `statut` : avenir | plateau | a_saisir | termine — « a_saisir » : l'athlète
 * est passé, le plateau est libéré, le jury n'a pas encore rendu la valeur.
 * `resultatStatut` : ok | zero | forfait — « zero » et « forfait » closent le
 * passage sans performance : rang nul, zéro point.
 */
export const passage = pgTable(
  "passage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    epreuveId: uuid("epreuve_id")
      .notNull()
      .references(() => epreuve.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athlete.id, { onDelete: "cascade" }),

    ordre: integer("ordre").notNull().default(0),
    statut: text("statut").notNull().default("avenir"),

    resultatStatut: text("resultat_statut"),
    /** Performance mesurée, dans l'unité de l'épreuve. */
    valeur: real("valeur"),
    /** Temps intermédiaire de départage, en secondes. */
    tempsS: real("temps_s"),
    /** Temps de chaque répétition, pour relire un passage contesté. */
    tours: real("tours").array(),

    /** Horodatage de la validation — sert aussi à retrouver le dernier verdict. */
    valideLe: timestamp("valide_le", { withTimezone: true }),

    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("passage_epreuve_idx").on(t.epreuveId),
    index("passage_athlete_idx").on(t.athleteId),
    index("passage_statut_idx").on(t.competitionId, t.statut),
  ],
);

/* ── Officiels ────────────────────────────────────────────────────────── */

/**
 * Purement informatif : sert à imprimer la feuille de match et à afficher le
 * jury. L'accès au logiciel ne passe PAS par cette table — voir `src/lib/auth.ts`.
 */
export const officiel = pgTable(
  "officiel",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    nom: text("nom").notNull(),
    role: text("role").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("officiel_competition_idx").on(t.competitionId)],
);

/* ── Programme de la journée ──────────────────────────────────────────── */

/**
 * Les moments de la journée, tels qu'ils s'affichent sur l'écran d'attente et
 * sur la fiche du speaker. L'heure reste du texte libre (« 14h00 ») : elle est
 * lue par un humain, jamais comparée ni calculée.
 */
export const programme = pgTable(
  "programme",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    heure: text("heure").notNull().default(""),
    texte: text("texte").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("programme_competition_idx").on(t.competitionId)],
);

/* ── Récompenses ──────────────────────────────────────────────────────── */

/**
 * Titre, prime et lot de chaque place. Affiché sur l'écran Podium et repris
 * au procès-verbal. Modifiable pendant la compétition : une dotation annoncée
 * la veille change parfois le matin même.
 */
export const recompense = pgTable(
  "recompense",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    /** 1 = première place. Fixe aussi la couleur affichée (or, argent, bronze). */
    rang: integer("rang").notNull().default(1),
    titre: text("titre").notNull().default(""),
    prime: text("prime").notNull().default(""),
    lot: text("lot").notNull().default(""),
  },
  (t) => [index("recompense_competition_idx").on(t.competitionId)],
);

/* ── Régie : sorties vidéo ────────────────────────────────────────────── */

/**
 * Une ligne par écran branché. `contenu` désigne la page publique diffusée :
 * attente | plateau | ordre | verdict | classement | podium | mire.
 *
 * La régie ne pilote PAS les écrans à distance : chaque écran ouvre son
 * adresse et s'y tient. Cette table dit seulement ce que la régie a décidé
 * d'afficher, pour que la liste des sorties survive à un redémarrage du poste.
 */
export const sortie = pgTable(
  "sortie",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    nom: text("nom").notNull().default("Nouvelle sortie"),
    contenu: text("contenu").notNull().default("attente"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("sortie_competition_idx").on(t.competitionId)],
);

/* ── Logos des clubs ──────────────────────────────────────────────────── */

/**
 * Un logo par club engagé, rapproché par le nom du club tel qu'il est saisi
 * sur les fiches. Le club n'a pas de table à lui : il n'est qu'un libellé sur
 * la fiche de l'athlète, et en faire une entité obligerait à le créer avant
 * de pouvoir inscrire quelqu'un.
 */
export const clubLogo = pgTable(
  "club_logo",
  {
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competition.id, { onDelete: "cascade" }),
    club: text("club").notNull(),
    logoUrl: text("logo_url"),
  },
  (t) => [primaryKey({ columns: [t.competitionId, t.club] })],
);

/* ── Journal d'audit ──────────────────────────────────────────────────── */

/**
 * Toute écriture qui touche un résultat laisse une trace. En cas de
 * réclamation, c'est la seule pièce qui permette de dire ce qui a été saisi,
 * quand, et depuis quel poste. Écrit en append only : jamais modifié, jamais
 * supprimé par l'application.
 */
export const journal = pgTable(
  "journal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id"),
    /** Action menée, en clair : « passage.valide », « athlete.supprime »… */
    action: text("action").notNull(),
    /** Entité visée, pour retrouver l'historique d'un athlète ou d'un passage. */
    cibleTable: text("cible_table"),
    cibleId: uuid("cible_id"),
    /** État avant / après, en JSON sérialisé. Sans données personnelles. */
    details: text("details"),
    /** Empreinte du poste : IP tronquée, jamais l'adresse complète. */
    origine: text("origine"),
    faitLe: timestamp("fait_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("journal_competition_idx").on(t.competitionId, t.faitLe)],
);

/* ── Types dérivés ────────────────────────────────────────────────────── */

export type Competition = typeof competition.$inferSelect;
export type Categorie = typeof categorie.$inferSelect;
export type Epreuve = typeof epreuve.$inferSelect;
export type Athlete = typeof athlete.$inferSelect;
export type Passage = typeof passage.$inferSelect;
export type Officiel = typeof officiel.$inferSelect;
export type Programme = typeof programme.$inferSelect;
export type Recompense = typeof recompense.$inferSelect;
export type Sortie = typeof sortie.$inferSelect;
export type ClubLogo = typeof clubLogo.$inferSelect;
