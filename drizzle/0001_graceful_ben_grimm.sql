CREATE TABLE "club_logo" (
	"competition_id" uuid NOT NULL,
	"club" text NOT NULL,
	"logo_url" text,
	CONSTRAINT "club_logo_competition_id_club_pk" PRIMARY KEY("competition_id","club")
);
--> statement-breakpoint
CREATE TABLE "programme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"heure" text DEFAULT '' NOT NULL,
	"texte" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recompense" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"rang" integer DEFAULT 1 NOT NULL,
	"titre" text DEFAULT '' NOT NULL,
	"prime" text DEFAULT '' NOT NULL,
	"lot" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"nom" text DEFAULT 'Nouvelle sortie' NOT NULL,
	"contenu" text DEFAULT 'attente' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete" ADD COLUMN "niveaux" text;--> statement-breakpoint
ALTER TABLE "athlete" ADD COLUMN "a_verifier" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "partenaires" text;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "theme_ecran" text DEFAULT 'nuit' NOT NULL;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "passage" text DEFAULT 'groupe' NOT NULL;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "niveau" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "niveaux_options" text;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "tours" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "ateliers" text;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "distance_totale" text;--> statement-breakpoint
ALTER TABLE "epreuve" ADD COLUMN "regle_fin" text;--> statement-breakpoint
ALTER TABLE "club_logo" ADD CONSTRAINT "club_logo_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme" ADD CONSTRAINT "programme_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recompense" ADD CONSTRAINT "recompense_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortie" ADD CONSTRAINT "sortie_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "programme_competition_idx" ON "programme" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "recompense_competition_idx" ON "recompense" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "sortie_competition_idx" ON "sortie" USING btree ("competition_id");