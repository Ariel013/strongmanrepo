/**
 * Connexion à PostgreSQL.
 *
 * Une seule instance par processus : en environnement serverless, chaque
 * invocation peut réutiliser un conteneur chaud, et ouvrir un pool par appel
 * épuiserait les connexions de la base en quelques minutes de compétition.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL manquant. Renseignez-le dans .env (local) ou dans les " +
      "variables d'environnement Vercel (en ligne).",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __sm_pg: ReturnType<typeof postgres> | undefined;
}

/**
 * En développement, Next recharge les modules à chaque édition. Sans ce cache
 * sur `globalThis`, chaque sauvegarde de fichier ouvrirait un pool de plus.
 */
const client =
  globalThis.__sm_pg ??
  postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Le jour J, une requête qui traîne vaut mieux qu'une page blanche :
    // on préfère échouer vite et laisser l'interface réessayer.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalThis.__sm_pg = client;

export const db = drizzle(client, { schema });
export { schema };
