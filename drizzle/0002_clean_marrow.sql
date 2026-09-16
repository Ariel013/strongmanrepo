ALTER TABLE "competition" ADD COLUMN "chrono_phase" text DEFAULT 'pret' NOT NULL;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "chrono_debut_le" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "chrono_duree_s" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "chrono_arret_s" real;