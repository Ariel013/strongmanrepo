/**
 * Connexion à PostgreSQL.
 *
 * Deux exigences se cumulent ici :
 *
 * 1. Une seule instance par processus. En serverless, chaque invocation peut
 *    réutiliser un conteneur chaud ; ouvrir un pool par appel épuiserait les
 *    connexions de la base en quelques minutes de compétition.
 *
 * 2. Une ouverture PARESSEUSE. Next importe les modules de route au moment de
 *    la compilation pour en collecter la configuration : si ce fichier lisait
 *    `DATABASE_URL` au chargement, le build échouerait partout où la variable
 *    n'est pas encore là — ce qui est le cas sur une plateforme de
 *    déploiement tant que l'environnement n'est pas injecté. La base n'est
 *    donc jointe qu'au premier accès réel, c'est-à-dire à l'exécution.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type BaseDrizzle = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  // eslint-disable-next-line no-var
  var __sm_pg: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __sm_db: BaseDrizzle | undefined;
}

function ouvrir(): BaseDrizzle {
  if (globalThis.__sm_db) return globalThis.__sm_db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. Renseignez-le dans .env (local) ou dans les " +
        "variables d'environnement de la plateforme (en ligne).",
    );
  }

  const client =
    globalThis.__sm_pg ??
    postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      // Le pooler Supabase en mode transaction ne conserve pas les requêtes
      // préparées d'une transaction à l'autre : les désactiver est requis.
      prepare: false,
    });

  const base = drizzle(client, { schema });

  // En développement, Next recharge les modules à chaque édition ; sans ce
  // cache, chaque sauvegarde de fichier ouvrirait un pool de plus.
  if (process.env.NODE_ENV !== "production") {
    globalThis.__sm_pg = client;
    globalThis.__sm_db = base;
  }
  return base;
}

/**
 * La base, jointe au premier accès.
 *
 * Le proxy sert exactement à cela : `db` existe comme objet dès l'import,
 * mais aucune connexion n'est tentée tant qu'on ne lit pas une propriété —
 * donc jamais pendant la compilation.
 */
export const db = new Proxy({} as BaseDrizzle, {
  get(_cible, propriete, recepteur) {
    return Reflect.get(ouvrir(), propriete, recepteur);
  },
});

export { schema };
