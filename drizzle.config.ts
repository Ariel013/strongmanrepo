import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Les migrations sont relues avant d'être appliquées : sur une base de
  // compétition, une migration muette qui efface une colonne est une
  // compétition perdue.
  verbose: true,
  strict: true,
});
