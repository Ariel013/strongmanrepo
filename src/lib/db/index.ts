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
  var __sm_pg: ReturnType<typeof postgres> | undefined;
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
      /**
       * Quatre connexions par conteneur.
       *
       * Une page en lit jusqu'à quatre tables d'un coup (`Promise.all` dans
       * `donnees.ts`) : en dessous de quatre, ces lectures se remettent
       * bêtement à la file. Au-dessus, on ne gagne plus rien et on rapproche
       * le pooler Supabase de sa limite, chaque instance serverless ayant son
       * propre pool.
       */
      max: 4,
      idle_timeout: 20,
      connect_timeout: 10,
      // Le pooler Supabase en mode transaction ne conserve pas les requêtes
      // préparées d'une transaction à l'autre : les désactiver est requis.
      prepare: false,
    });

  const base = drizzle(client, { schema });

  /**
   * Le cache est posé DANS TOUS LES CAS, production comprise.
   *
   * C'est tout l'objet de l'exigence n° 1 ci-dessus. Réservé au
   * développement, il laissait `ouvrir()` recréer un pool — donc rouvrir une
   * connexion TLS vers Supabase — à chaque accès à une propriété de `db`,
   * c'est-à-dire à chaque requête. Une page qui lit cinq tables payait cinq
   * poignées de main TLS, et abandonnait cinq pools derrière elle.
   *
   * En développement, le cache sert en plus à survivre au rechargement des
   * modules par Next à chaque édition.
   */
  globalThis.__sm_pg = client;
  globalThis.__sm_db = base;
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
