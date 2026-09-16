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
    age: integer("age"),
    note: text("note"),

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
});

/* ── Passages ─────────────────────────────────────────────────────────── */

/**
 * Un passage = un athlète sur une épreuve. Il porte à la fois la file
 * d'attente (`statut`, `ordre`) et la performance (`resultat*`).
 *
 * `statut` : avenir | plateau | termine
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
