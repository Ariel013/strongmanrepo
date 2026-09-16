CREATE TABLE "athlete" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"prenoms" text DEFAULT '' NOT NULL,
	"club" text,
	"pays" text DEFAULT 'CIV' NOT NULL,
	"poids_corps" numeric(5, 1),
	"poids_declare" numeric(5, 1),
	"pesee_validee" boolean DEFAULT false NOT NULL,
	"categorie_id" uuid,
	"dossard" integer,
	"hors_classement" boolean DEFAULT false NOT NULL,
	"photo_url" text,
	"taille_cm" integer,
	"age" integer,
	"note" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_contact" (
	"athlete_id" uuid PRIMARY KEY NOT NULL,
	"telephone" text,
	"contact_urgence" text,
	"commune" text
);
--> statement-breakpoint
CREATE TABLE "categorie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"poids_min" real,
	"poids_max" real,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"lieu" text,
	"adresse" text,
	"debut_le" timestamp with time zone,
	"fin_le" timestamp with time zone,
	"epreuve_courante_id" uuid,
	"categorie_courante_id" uuid,
	"suspendue" boolean DEFAULT false NOT NULL,
	"motif_suspension" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epreuve" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"mesure" text NOT NULL,
	"temps_limite_s" integer,
	"essais" integer DEFAULT 1 NOT NULL,
	"critere" text,
	"materiel" text,
	"equipements" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid,
	"action" text NOT NULL,
	"cible_table" text,
	"cible_id" uuid,
	"details" text,
	"origine" text,
	"fait_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officiel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"role" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"epreuve_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"statut" text DEFAULT 'avenir' NOT NULL,
	"resultat_statut" text,
	"valeur" real,
	"temps_s" real,
	"tours" real[],
	"valide_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_categorie_id_categorie_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categorie"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_contact" ADD CONSTRAINT "athlete_contact_athlete_id_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athlete"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorie" ADD CONSTRAINT "categorie_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epreuve" ADD CONSTRAINT "epreuve_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officiel" ADD CONSTRAINT "officiel_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage" ADD CONSTRAINT "passage_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage" ADD CONSTRAINT "passage_epreuve_id_epreuve_id_fk" FOREIGN KEY ("epreuve_id") REFERENCES "public"."epreuve"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage" ADD CONSTRAINT "passage_athlete_id_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athlete"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_competition_idx" ON "athlete" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "athlete_categorie_idx" ON "athlete" USING btree ("categorie_id");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_dossard_unique" ON "athlete" USING btree ("competition_id","dossard");--> statement-breakpoint
CREATE INDEX "categorie_competition_idx" ON "categorie" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "epreuve_competition_idx" ON "epreuve" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "journal_competition_idx" ON "journal" USING btree ("competition_id","fait_le");--> statement-breakpoint
CREATE INDEX "officiel_competition_idx" ON "officiel" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "passage_epreuve_idx" ON "passage" USING btree ("epreuve_id");--> statement-breakpoint
CREATE INDEX "passage_athlete_idx" ON "passage" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "passage_statut_idx" ON "passage" USING btree ("competition_id","statut");