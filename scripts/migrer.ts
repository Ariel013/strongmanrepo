/**
 * Applique les migrations du dossier `drizzle/`.
 *
 * `drizzle-kit push` échoue sur une base Supabase : son introspection trébuche
 * sur les contraintes CHECK des schémas internes de Supabase. Le migrateur de
 * `drizzle-orm`, lui, ne relit pas le schéma existant — il applique les
 * fichiers SQL versionnés et tient son propre journal. C'est de toute façon la
 * bonne voie pour une base de production : ce qui part en ligne est le SQL
 * relu, pas une différence recalculée au moment de l'exécution.
 *
 *   pnpm run db:migrer
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant. Lancez avec --env-file=.env");
  process.exit(1);
}

async function principal() {
  // `max: 1` : le migrateur doit tenir un verrou sur une seule connexion, sans
  // quoi deux instructions peuvent partir sur des sessions différentes.
  const client = postgres(url!, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.log("Migrations appliquées.");
  } catch (e) {
    console.error("Échec de la migration :", (e as Error).message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void principal();
